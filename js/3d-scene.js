/**
 * PromptNexus 3D背景场景
 * 使用Three.js创建动态粒子背景
 */
class Scene3D {
    constructor() {
        this.container = document.getElementById('scene-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.windowHalfX = window.innerWidth / 2;
        this.windowHalfY = window.innerHeight / 2;
        this.animationFrameId = null;
        this.isInitialized = false;
        
        // 增强粒子参数
        this.particleCount = 200; // 增加粒子数量
        this.maxParticleSize = 6;   // 稍微增大粒子尺寸
        this.maxSpeed = 0.5; // 增加粒子移动速度
        this.cameraDistance = 200; // 增加相机距离
        this.connectDistance = 100; // 连接距离
        this.interactive = true; // 交互模式
        
        // 记录性能状态
        this.performanceMode = false;
        
        // 鼠标移动效果增强
        this.mouseInfluence = 0.05; // 鼠标影响强度
        this.autoRotate = true;    // 自动旋转
        this.lastMouseMoveTime = 0; // 上次鼠标移动时间
        
        // 添加随机变化参数
        this.pulseSpeed = 0.02;    // 脉冲速度
        this.pulseTimer = 0;       // 脉冲计时器
    }
    
    /**
     * 初始化3D场景
     */
    init() {
        // 如果容器不存在则退出
        if (!this.container) {
            console.error('找不到场景容器元素');
            return false;
        }
        
        try {
            // 创建场景
            this.scene = new THREE.Scene();
            
            // 创建相机
            this.camera = new THREE.PerspectiveCamera(
                75,  // 视野角度更大，增强3D效果
                window.innerWidth / window.innerHeight, 
                1, 
                1000 // 增加远裁剪面
            );
            this.camera.position.z = this.cameraDistance;
            
            // 设置渲染器
            this.renderer = new THREE.WebGLRenderer({ 
                alpha: true,
                antialias: true 
            });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setClearColor(0x000000, 0);
            
            this.container.appendChild(this.renderer.domElement);
            
            // 创建粒子
            const positions = new Float32Array(this.particleCount * 3);
            const colors = new Float32Array(this.particleCount * 3);
            const sizes = new Float32Array(this.particleCount);
            
            const geometry = new THREE.BufferGeometry();
            
            // 使用圆形粒子材质（不需要外部图片）
            const disc = new THREE.TextureLoader().load('data:image/png;base64,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');
                        
            // 未来感蓝紫色系列颜色
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                
                // 位置
                positions[i3] = (Math.random() - 0.5) * 2 * window.innerWidth * 0.7;
                positions[i3 + 1] = (Math.random() - 0.5) * 2 * window.innerHeight * 0.7;
                positions[i3 + 2] = (Math.random() - 0.5) * 500;
                
                // 根据随机数选择不同色系
                const colorChoice = Math.random();
                
                if (colorChoice < 0.4) { 
                    // 蓝色
                    colors[i3] = 0.1 + Math.random() * 0.2; // R
                    colors[i3 + 1] = 0.4 + Math.random() * 0.3; // G
                    colors[i3 + 2] = 0.8 + Math.random() * 0.2; // B
                } else if (colorChoice < 0.7) {
                    // 青色
                    colors[i3] = 0.1 + Math.random() * 0.2; // R
                    colors[i3 + 1] = 0.6 + Math.random() * 0.3; // G
                    colors[i3 + 2] = 0.7 + Math.random() * 0.3; // B
                } else {
                    // 紫色
                    colors[i3] = 0.4 + Math.random() * 0.2; // R
                    colors[i3 + 1] = 0.1 + Math.random() * 0.2; // G
                    colors[i3 + 2] = 0.8 + Math.random() * 0.2; // B
                }
                
                // 大小
                sizes[i] = 1 + Math.random() * this.maxParticleSize;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

            // 材质
            this.particles = new THREE.Points(geometry, new THREE.PointsMaterial({
                size: 1,
                color: 0xffffff,
                map: disc,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            }));
            this.scene.add(this.particles);
            
            // 添加事件监听器
            window.addEventListener('resize', this.onWindowResize.bind(this));
            document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this));
            
            // 添加视差滚动效果
            window.addEventListener('scroll', this.onScroll.bind(this));
            
            // 开始动画循环
            this.animate();
            
            // 检测设备性能
            this.checkPerformance();
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('初始化3D场景失败:', error);
            this.destroy();
            return false;
        }
    }
    
    /**
     * 检查设备性能并调整参数
     */
    checkPerformance() {
        // 检测移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 对于移动设备或低性能设备，降低粒子数量
        if (isMobile) {
            this.particleCount = 600;
            this.maxParticleSize = 3;
            this.performanceMode = true;
            
            // 如果已创建粒子，重新创建
            if (this.particles) {
                this.scene.remove(this.particles);
                this.particles = null;
                this.init();
            }
        }
    }
    
    /**
     * 窗口大小改变事件处理
     */
    onWindowResize() {
        this.windowHalfX = window.innerWidth / 2;
        this.windowHalfY = window.innerHeight / 2;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * 鼠标移动事件处理 - 增强交互效果
     */
    onDocumentMouseMove(event) {
        this.mouseX = (event.clientX - this.windowHalfX) * this.mouseInfluence;
        this.mouseY = (event.clientY - this.windowHalfY) * this.mouseInfluence;
        this.lastMouseMoveTime = Date.now();
        
        // 暂时禁用自动旋转，让用户感觉交互更强
        this.autoRotate = false;
        
        // 2秒后恢复自动旋转
        setTimeout(() => {
            this.autoRotate = true;
        }, 2000);
    }
    
    /**
     * 页面滚动事件处理 - 添加视差效果
     */
    onScroll() {
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollFactor = scrollY * 0.0015;
        
        // 根据滚动位置微调相机位置
        this.camera.position.y = -scrollFactor * 20;
        
        // 调整粒子旋转
        if (this.particles) {
            this.particles.rotation.x = scrollFactor * 0.2;
        }
    }
    
    /**
     * 动画循环
     */
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
        this.pulseTimer += this.pulseSpeed;
        this.render();
    }
    
    /**
     * 渲染场景
     */
    render() {
        // 相机旋转 - 增强流畅性
        const time = Date.now() * 0.0005;
        const sinPulse = Math.sin(this.pulseTimer);
        
        // 当鼠标移动时，缓慢跟随鼠标
        this.camera.position.x += (this.mouseX - this.camera.position.x) * 0.02;
        this.camera.position.y += (-this.mouseY - this.camera.position.y) * 0.02;
        
        // 添加轻微的自动相机运动，增强生动感
        if (this.autoRotate) {
            this.camera.position.x += Math.sin(time * 0.7) * 0.5;
            this.camera.position.y += Math.cos(time * 0.5) * 0.5;
        }
        
        this.camera.lookAt(this.scene.position);
        
        // 粒子动画
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                
                // 移动粒子，不同方向不同速度
                positions[i3 + 1] -= (0.1 + Math.random() * 0.1) * this.maxSpeed;
                
                // 如果粒子移出屏幕下方，将其移回上方
                if (positions[i3 + 1] < -window.innerHeight) {
                    positions[i3 + 1] = window.innerHeight;
                    positions[i3] = (Math.random() - 0.5) * window.innerWidth * 2;
                }
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y += 0.0005;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * 销毁场景并释放资源
     */
    destroy() {
        // 停止动画循环
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // 移除事件监听器
        window.removeEventListener('resize', this.onWindowResize);
        document.removeEventListener('mousemove', this.onDocumentMouseMove);
        window.removeEventListener('scroll', this.onScroll);
        
        // 清除场景中的所有对象
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        // 清除渲染器
        if (this.renderer) {
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
        }
        
        // 清空引用
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.isInitialized = false;
    }
}

// 等待DOM加载完成后初始化3D场景
document.addEventListener('DOMContentLoaded', () => {
    const scene = new Scene3D();
    
    // 尝试初始化场景，如果失败则在控制台记录错误
    try {
        scene.init();
    } catch (error) {
        console.error('初始化3D场景时出错:', error);
    }
}); 
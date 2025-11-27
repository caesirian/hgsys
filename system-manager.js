// =============================================
// SYSTEM MANAGER - HG Sys
// Gestión del sistema modular principal
// =============================================

const systemManager = {
    // Configuración del sistema
    config: {
        currentModule: 'dashboard',
        modules: {
            dashboard: { name: 'Dashboard', icon: 'fas fa-tachometer-alt', file: null },
            mod1: { name: 'Módulo 1', icon: 'fas fa-chart-bar', file: 'mod1.html' },
            mod2: { name: 'Módulo 2', icon: 'fas fa-cog', file: 'mod2.html' },
            config: { name: 'Configuración', icon: 'fas fa-sliders-h', file: null },
            help: { name: 'Ayuda', icon: 'fas fa-question-circle', file: null }
        }
    },

    // Inicializar el sistema
    async init() {
        console.log('🔄 Inicializando sistema HG Sys...');
        
        try {
            // Verificar autenticación
            const isAuthenticated = await this.checkAuthentication();
            if (!isAuthenticated) {
                return;
            }

            // Configurar interfaz
            this.setupUI();
            this.setupEventListeners();
            this.loadUserInfo();

            // Mostrar sistema
            this.showSystem();
            
            console.log('✅ HG Sys inicializado correctamente');

        } catch (error) {
            console.error('❌ Error inicializando sistema:', error);
            this.showError('Error al inicializar el sistema');
        }
    },

    // Verificar autenticación
    async checkAuthentication() {
        return new Promise((resolve) => {
            const firebaseConfig = {
                apiKey: "AIzaSyCOoMcQ3gMWgoNumTxmqJngDqQDhYqi8Ec",
                authDomain: "hg-soluciones-f7090.firebaseapp.com",
                projectId: "hg-soluciones-f7090",
                storageBucket: "hg-soluciones-f7090.firebasestorage.app",
                messagingSenderId: "738232898260",
                appId: "1:738232898260:web:641e6a5732f8020a11a141",
                measurementId: "G-QXNXRCRPRG"
            };

            try {
                firebase.initializeApp(firebaseConfig);
                const auth = firebase.auth();

                auth.onAuthStateChanged((user) => {
                    if (user && user.email === 'hernan.garbarino@gmail.com') {
                        this.currentUser = user;
                        resolve(true);
                    } else {
                        console.log('🔐 Usuario no autenticado - Redirigiendo...');
                        window.location.replace('index.html');
                        resolve(false);
                    }
                });

            } catch (error) {
                console.error('❌ Error en verificación de auth:', error);
                window.location.replace('index.html');
                resolve(false);
            }
        });
    },

    // Configurar interfaz de usuario
    setupUI() {
        // Inicializar elementos de UI
        this.elements = {
            appContainer: document.getElementById('appContainer'),
            systemLoading: document.getElementById('systemLoading'),
            sidebar: document.getElementById('sidebar'),
            sidebarOverlay: document.getElementById('sidebarOverlay'),
            menuToggle: document.getElementById('menuToggle'),
            moduleContainer: document.getElementById('moduleContainer'),
            moduleTitle: document.getElementById('moduleTitle'),
            currentModule: document.getElementById('currentModule'),
            breadcrumb: document.getElementById('breadcrumb'),
            contentActions: document.getElementById('contentActions'),
            headerUserName: document.getElementById('headerUserName'),
            headerAvatar: document.getElementById('headerAvatar')
        };
    },

    // Configurar event listeners
    setupEventListeners() {
        // Toggle del sidebar
        this.elements.menuToggle.addEventListener('click', () => this.toggleSidebar());
        this.elements.sidebarOverlay.addEventListener('click', () => this.hideSidebar());

        // Navegación entre módulos
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = e.currentTarget.getAttribute('data-module');
                this.loadModule(module);
                this.hideSidebar(); // Ocultar sidebar en móviles
            });
        });

        // Cerrar sidebar al redimensionar
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.elements.sidebar.classList.remove('active');
                this.elements.sidebarOverlay.classList.remove('active');
            }
        });
    },

    // Cargar información del usuario
    loadUserInfo() {
        if (this.currentUser) {
            this.elements.headerUserName.textContent = 
                this.currentUser.displayName || this.currentUser.email.split('@')[0];
            
            if (this.currentUser.photoURL) {
                this.elements.headerAvatar.innerHTML = 
                    `<img src="${this.currentUser.photoURL}" alt="${this.currentUser.displayName}">`;
            }
        }
    },

    // Mostrar sistema principal
    showSystem() {
        this.elements.systemLoading.classList.remove('active');
        setTimeout(() => {
            this.elements.systemLoading.style.display = 'none';
            this.elements.appContainer.style.display = 'block';
        }, 500);
    },

    // Cargar módulo
    async loadModule(moduleId) {
        console.log(`📦 Cargando módulo: ${moduleId}`);
        
        const module = this.config.modules[moduleId];
        if (!module) {
            console.error('Módulo no encontrado:', moduleId);
            return;
        }

        // Actualizar navegación
        this.updateNavigation(moduleId, module.name);

        // Mostrar loading
        this.showModuleLoading();

        try {
            let htmlContent = '';

            if (module.file) {
                // Cargar módulo desde archivo externo
                const response = await fetch(module.file);
                if (!response.ok) throw new Error('Módulo no encontrado');
                htmlContent = await response.text();
            } else {
                // Módulo interno (dashboard, config, help)
                htmlContent = this.getInternalModule(moduleId);
            }

            // Renderizar módulo
            this.elements.moduleContainer.innerHTML = htmlContent;

            // Ejecutar scripts del módulo si existen
            this.executeModuleScripts(moduleId);

            console.log(`✅ Módulo ${moduleId} cargado correctamente`);

        } catch (error) {
            console.error(`❌ Error cargando módulo ${moduleId}:`, error);
            this.showModuleError(moduleId, error.message);
        }
    },

    // Obtener módulos internos
    getInternalModule(moduleId) {
        const modules = {
            dashboard: `
                <div class="module-content">
                    <div class="module-header">
                        <h2><i class="fas fa-tachometer-alt"></i> Dashboard Principal</h2>
                        <p>Vista general del sistema</p>
                    </div>
                    <div class="dashboard-grid">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h3>1</h3>
                                <p>Usuario Activo</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-cube"></i>
                            </div>
                            <div class="stat-info">
                                <h3>2</h3>
                                <p>Módulos</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <div class="stat-info">
                                <h3>100%</h3>
                                <p>Seguro</p>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            config: `
                <div class="module-content">
                    <div class="module-header">
                        <h2><i class="fas fa-sliders-h"></i> Configuración</h2>
                        <p>Configuración del sistema</p>
                    </div>
                    <div class="config-grid">
                        <div class="config-section">
                            <h3>Preferencias</h3>
                            <div class="config-item">
                                <label>Tema</label>
                                <select>
                                    <option>Claro</option>
                                    <option>Oscuro</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            help: `
                <div class="module-content">
                    <div class="module-header">
                        <h2><i class="fas fa-question-circle"></i> Ayuda</h2>
                        <p>Centro de ayuda del sistema</p>
                    </div>
                    <div class="help-content">
                        <h3>HG Sys - Sistema Modular</h3>
                        <p>Este es un sistema básico modular para desarrollo de proyectos web.</p>
                        
                        <div class="help-section">
                            <h4>Características:</h4>
                            <ul>
                                <li>Autenticación segura con Google</li>
                                <li>Arquitectura modular escalable</li>
                                <li>Interfaz responsive</li>
                                <li>Fácil de extender</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `
        };

        return modules[moduleId] || '<div class="error-message">Módulo no disponible</div>';
    },

    // Actualizar navegación
    updateNavigation(moduleId, moduleName) {
        // Actualizar links activos
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleId}"]`).classList.add('active');

        // Actualizar título y breadcrumb
        const module = this.config.modules[moduleId];
        this.elements.moduleTitle.innerHTML = `
            <i class="${module.icon}"></i>
            <span>${moduleName}</span>
        `;
        this.elements.currentModule.textContent = moduleName;

        // Actualizar breadcrumb
        this.elements.breadcrumb.innerHTML = `
            <span>HG Sys</span>
            <i class="fas fa-chevron-right"></i>
            <span>${moduleName}</span>
        `;
    },

    // Mostrar loading del módulo
    showModuleLoading() {
        this.elements.moduleContainer.innerHTML = `
            <div class="module-loading">
                <div class="loading-spinner">
                    <div class="spinner-circle"></div>
                    <div class="spinner-circle"></div>
                    <div class="spinner-circle"></div>
                </div>
                <p>Cargando módulo...</p>
            </div>
        `;
    },

    // Mostrar error del módulo
    showModuleError(moduleId, error) {
        this.elements.moduleContainer.innerHTML = `
            <div class="module-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error cargando módulo</h3>
                <p>No se pudo cargar el módulo "${moduleId}"</p>
                <small>Error: ${error}</small>
                <button class="retry-btn" onclick="systemManager.loadModule('${moduleId}')">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    },

    // Ejecutar scripts del módulo
    executeModuleScripts(moduleId) {
        // Aquí se pueden ejecutar scripts específicos del módulo
        console.log(`🔧 Ejecutando scripts del módulo: ${moduleId}`);
        
        // Ejemplo: inicializar componentes específicos del módulo
        switch (moduleId) {
            case 'mod1':
                this.initModule1();
                break;
            case 'mod2':
                this.initModule2();
                break;
        }
    },

    // Inicializar módulo 1
    initModule1() {
        console.log('🔧 Inicializando Módulo 1');
        // Aquí puedes inicializar componentes específicos del módulo 1
    },

    // Inicializar módulo 2
    initModule2() {
        console.log('🔧 Inicializando Módulo 2');
        // Aquí puedes inicializar componentes específicos del módulo 2
    },

    // Control del sidebar
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('active');
        this.elements.sidebarOverlay.classList.toggle('active');
    },

    hideSidebar() {
        this.elements.sidebar.classList.remove('active');
        this.elements.sidebarOverlay.classList.remove('active');
    },

    // Cerrar sesión
    logout() {
        if (confirm('¿Estás seguro de que querés cerrar sesión?')) {
            firebase.auth().signOut().then(() => {
                window.location.replace('index.html');
            }).catch((error) => {
                console.error('Error cerrando sesión:', error);
            });
        }
    },

    // Mostrar notificación del sistema
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `system-notification system-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Mostrar
        setTimeout(() => notification.classList.add('show'), 100);

        // Ocultar después de 4 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    },

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    // Mostrar error del sistema
    showError(message) {
        this.showNotification(message, 'error');
    }
};
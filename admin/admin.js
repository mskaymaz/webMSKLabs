/**
 * DevAdmin Shell Framework, State Manager & Navigation (UI-001, UI-005, UI-006)
 * Handles Auth integration (SEC-AUTH-002), Cmd+K Search, Error Boundary & Mobile Nav
 */

(function () {
    'use strict';

    // Application State
    const state = {
        token: localStorage.getItem('devadmin_token') || null,
        user: null,
        currentView: 'dashboard',
        isOffline: !navigator.onLine,
        searchQuery: '',
        searchOpen: false
    };

    // Global Error Boundary Handler
    window.addEventListener('error', function (event) {
        console.error('Global Application Error:', event.error || event.message);
        showGlobalError('Bir uygulama hatası oluştu. Lütfen sayfayı yenileyin.');
    });

    window.addEventListener('unhandledrejection', function (event) {
        console.error('Unhandled Promise Rejection:', event.reason);
        showGlobalError('Sunucu bağlantı hatası oluştu.');
    });

    // Offline Detection
    window.addEventListener('online', function () {
        state.isOffline = false;
        toggleOfflineBanner(false);
    });
    window.addEventListener('offline', function () {
        state.isOffline = true;
        toggleOfflineBanner(true);
    });

    // DOM Elements
    const elements = {};

    document.addEventListener('DOMContentLoaded', function () {
        initElements();
        initEventListeners();
        checkInitialAuth();
    });

    function initElements() {
        elements.loginSection = document.getElementById('login-section');
        elements.appSection = document.getElementById('app-section');
        elements.loginForm = document.getElementById('login-form');
        elements.loginAlert = document.getElementById('login-alert');
        elements.loginSubmitBtn = document.getElementById('login-submit-btn');
        elements.sidebar = document.getElementById('admin-sidebar');
        elements.sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
        elements.mobileNav = document.getElementById('mobile-bottom-nav');
        elements.navItems = document.querySelectorAll('.nav-item');
        elements.viewContainers = document.querySelectorAll('.view-container');
        elements.headerTitle = document.getElementById('header-title');
        elements.userPillName = document.getElementById('user-pill-name');
        elements.logoutBtn = document.getElementById('logout-btn');
        elements.searchBtn = document.getElementById('header-search-btn');
        elements.searchModal = document.getElementById('search-modal');
        elements.searchInput = document.getElementById('global-search-input');
        elements.searchCloseBtn = document.getElementById('search-close-btn');
        elements.offlineBanner = document.getElementById('offline-banner');
        elements.errorContainer = document.getElementById('global-error-container');
        elements.rtlToggleBtn = document.getElementById('rtl-toggle-btn');
    }

    function initEventListeners() {
        // Login Form Submission
        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', handleLoginSubmit);
        }

        // Logout
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', handleLogout);
        }

        // Sidebar Navigation
        elements.navItems.forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                if (view) switchView(view);
            });
        });

        // Mobile Sidebar Toggle
        if (elements.sidebarToggleBtn) {
            elements.sidebarToggleBtn.addEventListener('click', function () {
                elements.sidebar.classList.toggle('open');
            });
        }

        // Global Search (Cmd+K / Ctrl+K)
        if (elements.searchBtn) {
            elements.searchBtn.addEventListener('click', openSearchModal);
        }
        if (elements.searchCloseBtn) {
            elements.searchCloseBtn.addEventListener('click', closeSearchModal);
        }

        document.addEventListener('keydown', function (e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                openSearchModal();
            }
            if (e.key === 'Escape' && state.searchOpen) {
                closeSearchModal();
            }
        });

        // RTL Mode Toggle
        if (elements.rtlToggleBtn) {
            elements.rtlToggleBtn.addEventListener('click', function () {
                const currentDir = document.documentElement.getAttribute('dir') || 'ltr';
                const newDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
                document.documentElement.setAttribute('dir', newDir);
                elements.rtlToggleBtn.textContent = newDir === 'rtl' ? 'LTR' : 'RTL';
            });
        }
    }

    // Auth Verification (Connected to SEC-AUTH-002)
    async function checkInitialAuth() {
        if (!state.token) {
            showLoginView();
            return;
        }

        try {
            const res = await fetch('/api/admin/me', {
                headers: {
                    'Authorization': 'Bearer ' + state.token
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.user) {
                    state.user = data.user;
                    showAppShellView();
                    return;
                }
            }
            // Invalid session
            clearAuthToken();
            showLoginView();
        } catch {
            // Offline or server issue fallback
            showLoginView();
        }
    }

    async function handleLoginSubmit(e) {
        e.preventDefault();
        hideLoginAlert();

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            showLoginAlert('Kullanıcı adı ve şifre gereklidir.');
            return;
        }

        setLoginLoading(true);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: username, password: password })
            });

            const data = await res.json();

            if (res.ok && data.success && data.token) {
                setAuthToken(data.token);
                state.user = data.user;
                showAppShellView();
            } else {
                const msg = data.message || 'Giriş işlemi başarısız.';
                showLoginAlert(msg);
            }
        } catch (error) {
            showLoginAlert('Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.');
        } finally {
            setLoginLoading(false);
        }
    }

    async function handleLogout() {
        if (state.token) {
            try {
                await fetch('/api/admin/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + state.token }
                });
            } catch (err) {
                console.warn('Logout notification error:', err);
            }
        }
        clearAuthToken();
        showLoginView();
    }

    // View Management
    function switchView(viewName) {
        state.currentView = viewName;

        elements.navItems.forEach(function (item) {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        elements.viewContainers.forEach(function (container) {
            if (container.id === 'view-' + viewName) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        });

        const titleMap = {
            dashboard: 'Genel Bakış',
            tickets: 'Destek Biletleri',
            comments: 'Yorum Yönetimi',
            cms: 'Headless CMS',
            settings: 'Sistem Ayarları'
        };

        if (elements.headerTitle) {
            elements.headerTitle.textContent = titleMap[viewName] || 'DevAdmin';
        }

        // Trigger module load handlers
        if (viewName === 'tickets' && window.DevAdminTickets) {
            window.DevAdminTickets.init();
            window.DevAdminTickets.load();
        } else if (viewName === 'comments' && window.DevAdminComments) {
            window.DevAdminComments.init();
            window.DevAdminComments.load();
        }

        if (elements.sidebar && window.innerWidth <= 640) {
            elements.sidebar.classList.remove('open');
        }
    }

    function showLoginView() {
        if (elements.loginSection) elements.loginSection.style.display = 'flex';
        if (elements.appSection) elements.appSection.style.display = 'none';
    }

    function showAppShellView() {
        if (elements.loginSection) elements.loginSection.style.display = 'none';
        if (elements.appSection) elements.appSection.style.display = 'flex';
        if (elements.userPillName && state.user) {
            elements.userPillName.textContent = state.user.username + ' (' + state.user.role + ')';
        }
        switchView('dashboard');
    }

    function setAuthToken(token) {
        state.token = token;
        localStorage.setItem('devadmin_token', token);
    }

    function clearAuthToken() {
        state.token = null;
        state.user = null;
        localStorage.removeItem('devadmin_token');
    }

    function showLoginAlert(msg) {
        if (elements.loginAlert) {
            elements.loginAlert.textContent = msg;
            elements.loginAlert.style.display = 'block';
        }
    }

    function hideLoginAlert() {
        if (elements.loginAlert) elements.loginAlert.style.display = 'none';
    }

    function setLoginLoading(isLoading) {
        if (elements.loginSubmitBtn) {
            elements.loginSubmitBtn.disabled = isLoading;
            elements.loginSubmitBtn.textContent = isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap';
        }
    }

    // Global Search Modal Handlers (Cmd+K)
    function openSearchModal() {
        if (elements.searchModal) {
            elements.searchModal.style.display = 'flex';
            state.searchOpen = true;
            if (elements.searchInput) elements.searchInput.focus();
        }
    }

    function closeSearchModal() {
        if (elements.searchModal) {
            elements.searchModal.style.display = 'none';
            state.searchOpen = false;
        }
    }

    // Global Error & Offline UI Handlers
    function showGlobalError(msg) {
        if (elements.errorContainer) {
            elements.errorContainer.innerHTML = '<div class="alert alert-error">' + msg + '</div>';
            elements.errorContainer.style.display = 'block';
        }
    }

    function toggleOfflineBanner(show) {
        if (elements.offlineBanner) {
            elements.offlineBanner.style.display = show ? 'block' : 'none';
        }
    }
})();

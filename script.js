// TalentSync - Complete Freelancing Platform with Firebase Integration
// Author: AI Assistant
// Version: 2.0.0

class TalentSync {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'home';
        this.translations = {};
        this.currentLanguage = 'en';
        this.useFirebase = true; // Flag to use Firebase or localStorage
        
        this.init();
    }

    init() {
        // Ensure DOM is ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
            return;
        }

        this.loadTranslations();
        this.initializeEventListeners();
        this.loadUserSession();
        this.populateCategories();
        this.populateFeaturedFreelancers();

        // Monitor connection status
        this.setupConnectionMonitoring();

        // Always ensure demo users are available for testing
        this.initializeDemoData();

        // Wait for Firebase to initialize, then load data
        if (typeof firebaseService !== 'undefined') {
            this.waitForFirebase();
        } else {
            // Fallback to localStorage
            this.initializeDemoData();
        }

        this.updateUI();

        // Handle window resize for responsive navigation
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Initial setup for mobile navigation
        this.handleResize();
    }

    handleResize() {
        const isMobile = window.innerWidth <= 768;
        const navActions = document.getElementById('nav-actions');
        const navMenu = document.getElementById('nav-menu');

        if (isMobile) {
            // Hide original nav-actions on mobile
            if (navActions) {
                navActions.style.display = 'none';
            }
            // Setup mobile navigation will be called when menu opens
        } else {
            // Desktop view
            if (navActions) {
                navActions.style.display = 'flex';
            }

            // Remove mobile actions container
            if (navMenu) {
                const mobileActionsContainer = navMenu.querySelector('.mobile-nav-actions');
                if (mobileActionsContainer) {
                    mobileActionsContainer.remove();
                }
            }

            // Close mobile menu if open
            this.closeMobileMenu();
        }
    }

    setupConnectionMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.showToast('Connection restored', 'success');
            this.isOnline = true;

            // Retry Firebase connection if needed
            if (this.useFirebase && firebaseService) {
                this.syncOfflineData();
            }
        });

        window.addEventListener('offline', () => {
            this.showToast('You are offline. Changes will be saved locally.', 'info');
            this.isOnline = false;
        });

        this.isOnline = navigator.onLine;
    }

    async syncOfflineData() {
        // Sync any offline changes when connection is restored
        try {
            console.log('Syncing offline data...');

            // Check for pending data in localStorage that needs to be synced
            const pendingJobs = JSON.parse(localStorage.getItem('pendingJobs') || '[]');
            const pendingProposals = JSON.parse(localStorage.getItem('pendingProposals') || '[]');
            const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');

            // Sync pending jobs
            for (const job of pendingJobs) {
                const result = await firebaseService.saveJob(job);
                if (result.success) {
                    console.log('Synced offline job:', job.title);
                }
            }

            // Sync pending proposals
            for (const proposal of pendingProposals) {
                const result = await firebaseService.saveProposal(proposal);
                if (result.success) {
                    console.log('Synced offline proposal:', proposal.id);
                }
            }

            // Sync pending messages
            for (const message of pendingMessages) {
                const result = await firebaseService.saveMessage(message);
                if (result.success) {
                    console.log('Synced offline message:', message.id);
                }
            }

            // Clear pending data after successful sync
            localStorage.removeItem('pendingJobs');
            localStorage.removeItem('pendingProposals');
            localStorage.removeItem('pendingMessages');

            this.showToast('Offline changes synced successfully', 'success');
        } catch (error) {
            console.error('Error syncing offline data:', error);
            this.showToast('Some offline changes could not be synced', 'error');
        }
    }

    async waitForFirebase() {
        // Wait for Firebase to be ready
        let attempts = 0;
        const maxAttempts = 50;

        console.log('Waiting for Firebase to initialize...');

        while (attempts < maxAttempts) {
            if (firebaseService && firebaseService.db) {
                console.log('Firebase is ready, initializing demo data...');

                try {
                    await firebaseService.initializeDemoData();
                    console.log('Demo data initialization completed');
                } catch (error) {
                    console.error('Demo data initialization failed:', error);
                }

                // Migrate localStorage data to Firebase if needed
                await this.migrateLocalStorageToFirebase();
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;

            if (attempts % 10 === 0) {
                console.log(`Still waiting for Firebase... attempt ${attempts}/${maxAttempts}`);
            }
        }

        if (attempts >= maxAttempts) {
            console.log('Firebase initialization timeout, falling back to localStorage');
            this.useFirebase = false;
            this.initializeDemoData();
        } else {
            console.log('Firebase initialization completed successfully');
        }
    }

    async migrateLocalStorageToFirebase() {
        try {
            // Check if migration is needed
            const migrationFlag = localStorage.getItem('firebaseMigrated');
            if (migrationFlag === 'true') {
                console.log('Data already migrated to Firebase');
                return;
            }

            console.log('Starting data migration to Firebase...');

            // Migrate users (skip this as users will be created through signup)
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            console.log(`Found ${users.length} users in localStorage (will be migrated on signup)`);

            // Migrate jobs
            const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
            for (const job of jobs) {
                try {
                    const result = await firebaseService.saveJob(job);
                    if (result.success) {
                        console.log(`Migrated job: ${job.title}`);
                    }
                } catch (error) {
                    console.log(`Failed to migrate job: ${job.title}`, error);
                }
            }

            // Migrate proposals
            const proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
            for (const proposal of proposals) {
                try {
                    const result = await firebaseService.saveProposal(proposal);
                    if (result.success) {
                        console.log(`Migrated proposal: ${proposal.id}`);
                    }
                } catch (error) {
                    console.log(`Failed to migrate proposal: ${proposal.id}`, error);
                }
            }

            // Mark migration as complete
            localStorage.setItem('firebaseMigrated', 'true');
            console.log('Data migration to Firebase completed successfully');

        } catch (error) {
            console.error('Error during data migration:', error);
        }
    }

    // Initialize Event Listeners
    // Initialize Event Listeners
    initializeEventListeners() {
        // Load theme first before setting up listeners
        this.loadTheme();
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Navigation buttons
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.showSignupModal());
        }

        // Modal overlay
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // Enhanced mobile navigation with accessibility
        this.setupMobileNavigation();

        // Search functionality
        const heroSearch = document.getElementById('hero-search');
        if (heroSearch) {
            heroSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }

        // Keyboard navigation support
        this.setupKeyboardNavigation();
    }

    setupMobileNavigation() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        if (navToggle && navMenu) {
            // Remove existing event listeners by cloning and replacing
            const newNavToggle = navToggle.cloneNode(true);
            navToggle.parentNode.replaceChild(newNavToggle, navToggle);

            // Add ARIA attributes for accessibility
            newNavToggle.setAttribute('aria-label', 'Toggle navigation menu');
            newNavToggle.setAttribute('aria-expanded', 'false');
            newNavToggle.setAttribute('aria-controls', 'nav-menu');
            navMenu.setAttribute('aria-hidden', 'true');

            // Add click handler to hamburger button (works as both open and close)
            newNavToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isActive = navMenu.classList.contains('active');

                navMenu.classList.toggle('active');
                newNavToggle.classList.toggle('active');

                // Update ARIA attributes
                newNavToggle.setAttribute('aria-expanded', !isActive);
                navMenu.setAttribute('aria-hidden', isActive);

                // Update aria-label based on state
                if (!isActive) {
                    newNavToggle.setAttribute('aria-label', 'Close navigation menu');
                } else {
                    newNavToggle.setAttribute('aria-label', 'Open navigation menu');
                }

                // Prevent body scroll when menu is open
                if (navMenu.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
                    // Setup mobile nav actions when menu opens
                    this.setupMobileNavActions();
                    // Focus first menu item for keyboard navigation
                    const firstLink = navMenu.querySelector('.nav-link');
                    if (firstLink) {
                        setTimeout(() => firstLink.focus(), 100);
                    }
                } else {
                    document.body.style.overflow = 'auto';
                }
            });

            // Close menu when clicking on a link
            navMenu.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMobileMenu();
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                const currentNavToggle = document.getElementById('nav-toggle');
                if (currentNavToggle && !currentNavToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });

            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                    this.closeMobileMenu();
                    const currentNavToggle = document.getElementById('nav-toggle');
                    if (currentNavToggle) currentNavToggle.focus();
                }
            });
        }
    }

    setupMobileNavActions() {
        const navMenu = document.getElementById('nav-menu');
        const navActions = document.getElementById('nav-actions');

        if (navMenu && navActions) {
            // Check if mobile actions container already exists
            let mobileActionsContainer = navMenu.querySelector('.mobile-nav-actions');

            if (!mobileActionsContainer) {
                // Create mobile actions container
                mobileActionsContainer = document.createElement('div');
                mobileActionsContainer.className = 'mobile-nav-actions';

                // Clone nav-actions content (deep clone to get all children)
                const actionsClone = navActions.cloneNode(true);
                actionsClone.id = 'mobile-nav-actions';
                actionsClone.style.display = 'flex !important';
                actionsClone.style.flexDirection = 'column';
                actionsClone.style.gap = '0.75rem';
                actionsClone.style.width = '100%';

                // Append cloned actions to mobile container
                mobileActionsContainer.appendChild(actionsClone);

                // Append to nav-menu
                navMenu.appendChild(mobileActionsContainer);

                // Re-attach event listeners for cloned elements
                this.attachMobileActionListeners(actionsClone);
            }
        }
    }

    attachMobileActionListeners(actionsContainer) {
        // Theme toggle
        const themeToggle = actionsContainer.querySelector('.theme-toggle');
        if (themeToggle) {
            // Give it a unique ID to avoid conflicts
            themeToggle.id = 'mobile-theme-toggle';
            // Remove any existing listeners and add new one
            const newThemeToggle = themeToggle.cloneNode(true);
            themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);
            newThemeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Login button
        const loginBtn = actionsContainer.querySelector('#login-btn');
        if (loginBtn) {
            loginBtn.id = 'mobile-login-btn';
            loginBtn.addEventListener('click', () => {
                this.closeMobileMenu();
                this.showLoginModal();
            });
        }

        // Signup button
        const signupBtn = actionsContainer.querySelector('#signup-btn');
        if (signupBtn) {
            signupBtn.id = 'mobile-signup-btn';
            signupBtn.addEventListener('click', () => {
                this.closeMobileMenu();
                this.showSignupModal();
            });
        }

        // User menu (if logged in)
        const userAvatar = actionsContainer.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserDropdown();
            });
        }
    }

    closeMobileMenu() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        if (navToggle && navMenu) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            navMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = 'auto';
        }
    }

    setupKeyboardNavigation() {
        // Tab trap for modals
        document.addEventListener('keydown', (e) => {
            const modal = document.querySelector('.modal-overlay.active .modal');
            if (modal && e.key === 'Tab') {
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }

    // Theme Management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Update theme toggle icons in all locations
        this.updateAllThemeIcons(newTheme);
        
        this.showToast(`Switched to ${newTheme} mode`, 'success');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update all theme icons on load
        this.updateAllThemeIcons(savedTheme);
    }

    updateAllThemeIcons(theme) {
        // Update main theme toggle
        const mainIcon = document.querySelector('#theme-toggle i');
        if (mainIcon) {
            mainIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        // Update mobile theme toggle
        const mobileIcon = document.querySelector('#mobile-theme-toggle i');
        if (mobileIcon) {
            mobileIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        // Update any other theme toggles in the page
        const allThemeToggles = document.querySelectorAll('.theme-toggle i');
        allThemeToggles.forEach(icon => {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    // Language Management
    loadTranslations() {
        this.translations = {
            en: {
                title: "Find the Perfect Freelancer for Your Project",
                subtitle: "Connect with talented professionals worldwide and get your work done efficiently",
                searchPlaceholder: "Search for services...",
                login: "Log In",
                signup: "Sign Up",
                categories: "Popular Categories",
                featuredFreelancers: "Top Rated Freelancers"
            },
            es: {
                title: "Encuentra el Freelancer Perfecto para tu Proyecto",
                subtitle: "Conecta con profesionales talentosos en todo el mundo y haz tu trabajo de manera eficiente",
                searchPlaceholder: "Buscar servicios...",
                login: "Iniciar Sesión",
                signup: "Registrarse",
                categories: "Categorías Populares",
                featuredFreelancers: "Freelancers Mejor Valorados"
            },
            fr: {
                title: "Trouvez le Freelancer Parfait pour Votre Projet",
                subtitle: "Connectez-vous avec des professionnels talentueux dans le monde entier et faites votre travail efficacement",
                searchPlaceholder: "Rechercher des services...",
                login: "Se Connecter",
                signup: "S'inscrire",
                categories: "Catégories Populaires",
                featuredFreelancers: "Freelancers les Mieux Notés"
            }
        };
    }

    changeLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        this.updateLanguageContent();
        this.showToast('Language changed successfully', 'success');
    }

    updateLanguageContent() {
        const t = this.translations[this.currentLanguage];

        // Update hero section
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroSearch = document.getElementById('hero-search');

        if (heroTitle) heroTitle.textContent = t.title;
        if (heroSubtitle) heroSubtitle.textContent = t.subtitle;
        if (heroSearch) heroSearch.placeholder = t.searchPlaceholder;

        // Update buttons
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');

        if (loginBtn) loginBtn.textContent = t.login;
        if (signupBtn) signupBtn.textContent = t.signup;

        // Update section titles
        const categoriesTitle = document.querySelector('.categories-section .section-title');
        const freelancersTitle = document.querySelector('.featured-section .section-title');

        if (categoriesTitle) categoriesTitle.textContent = t.categories;
        if (freelancersTitle) freelancersTitle.textContent = t.featuredFreelancers;
    }

    // Categories Data and Population
    populateCategories() {
        const categories = [
            {
                icon: 'fas fa-code',
                title: 'Web Development',
                description: 'Frontend, Backend, Full-stack development',
                count: '2,500+ projects'
            },
            {
                icon: 'fas fa-mobile-alt',
                title: 'Mobile Development',
                description: 'iOS, Android, React Native, Flutter',
                count: '1,800+ projects'
            },
            {
                icon: 'fas fa-paint-brush',
                title: 'Graphic Design',
                description: 'Logo, Branding, UI/UX, Print design',
                count: '3,200+ projects'
            },
            {
                icon: 'fas fa-pen-fancy',
                title: 'Content Writing',
                description: 'Blog posts, Copywriting, Technical writing',
                count: '2,100+ projects'
            },
            {
                icon: 'fas fa-chart-line',
                title: 'Digital Marketing',
                description: 'SEO, Social Media, PPC, Email marketing',
                count: '1,900+ projects'
            },
            {
                icon: 'fas fa-video',
                title: 'Video & Animation',
                description: 'Video editing, Motion graphics, 3D animation',
                count: '1,400+ projects'
            },
            {
                icon: 'fas fa-database',
                title: 'Data Science',
                description: 'Data analysis, Machine learning, AI',
                count: '800+ projects'
            },
            {
                icon: 'fas fa-microphone',
                title: 'Voice & Audio',
                description: 'Voice over, Audio editing, Music production',
                count: '600+ projects'
            }
        ];

        const categoriesGrid = document.getElementById('categories-grid');
        if (categoriesGrid) {
            categoriesGrid.innerHTML = categories.map(category => `
                <div class="category-card" onclick="talentSync.browseCategory('${category.title}')">
                    <div class="category-icon">
                        <i class="${category.icon}"></i>
                    </div>
                    <h3>${category.title}</h3>
                    <p>${category.description}</p>
                    <small>${category.count}</small>
                </div>
            `).join('');
        }
    }

    // Featured Freelancers Data and Population
    populateFeaturedFreelancers() {
        const freelancers = [
            {
                id: 1,
                name: 'Sarah Johnson',
                title: 'Full Stack Developer',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
                rating: 4.9,
                reviews: 127,
                skills: ['React', 'Node.js', 'Python', 'AWS'],
                hourlyRate: 85,
                completedJobs: 156
            },
            {
                id: 2,
                name: 'Michael Chen',
                title: 'UI/UX Designer',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
                rating: 4.8,
                reviews: 89,
                skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping'],
                hourlyRate: 75,
                completedJobs: 98
            },
            {
                id: 3,
                name: 'Emily Rodriguez',
                title: 'Digital Marketing Expert',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
                rating: 4.9,
                reviews: 203,
                skills: ['SEO', 'Google Ads', 'Social Media', 'Analytics'],
                hourlyRate: 65,
                completedJobs: 234
            },
            {
                id: 4,
                name: 'David Kim',
                title: 'Mobile App Developer',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                rating: 4.7,
                reviews: 156,
                skills: ['React Native', 'Flutter', 'iOS', 'Android'],
                hourlyRate: 90,
                completedJobs: 187
            },
            {
                id: 5,
                name: 'Lisa Thompson',
                title: 'Content Writer & Copywriter',
                avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
                rating: 4.8,
                reviews: 178,
                skills: ['Content Writing', 'Copywriting', 'SEO Writing', 'Blogging'],
                hourlyRate: 45,
                completedJobs: 289
            },
            {
                id: 6,
                name: 'Alex Martinez',
                title: 'Data Scientist',
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
                rating: 4.9,
                reviews: 94,
                skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
                hourlyRate: 95,
                completedJobs: 112
            }
        ];

        const freelancersGrid = document.getElementById('featured-freelancers');
        if (freelancersGrid) {
            freelancersGrid.innerHTML = freelancers.map(freelancer => `
                <div class="freelancer-card" onclick="talentSync.viewFreelancerProfile(${freelancer.id})">
                    <div class="freelancer-avatar">
                        <img src="${freelancer.avatar}" alt="${freelancer.name}">
                    </div>
                    <h3 class="freelancer-name">${freelancer.name}</h3>
                    <p class="freelancer-title">${freelancer.title}</p>
                    <div class="freelancer-rating">
                        <div class="stars">
                            ${this.generateStars(freelancer.rating)}
                        </div>
                        <span>${freelancer.rating} (${freelancer.reviews} reviews)</span>
                    </div>
                    <div class="freelancer-skills">
                        ${freelancer.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                    <div class="freelancer-rate">$${freelancer.hourlyRate}/hr</div>
                    <button class="btn btn-primary">View Profile</button>
                </div>
            `).join('');
        }
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }

        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }

        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    // Modal Management
    showLoginModal() {
        const modalHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Welcome Back</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="login-form" onsubmit="talentSync.handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-input" name="email" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div class="password-input-container">
                            <input type="password" class="form-input" name="password" required>
                            <button type="button" class="password-toggle" onclick="talentSync.togglePassword(this)">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="remember-me" name="remember">
                            <label for="remember-me">Remember me</label>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Sign In
                    </button>
                </form>
                <div style="text-align: center; margin-top: 1rem;">
                    <p>Don't have an account? 
                        <a href="#" onclick="talentSync.showSignupModal()" style="color: var(--primary-color);">Sign up here</a>
                    </p>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    }

    showSignupModal() {
        const modalHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Join TalentSync</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="signup-form" onsubmit="talentSync.handleSignup(event)">
                    <div class="form-group">
                        <label class="form-label">I want to:</label>
                        <div class="role-selector">
                            <div class="role-option" onclick="talentSync.selectRole('freelancer', this)">
                                <i class="fas fa-user-tie"></i>
                                <h4>Work as a Freelancer</h4>
                                <p>Find projects and clients</p>
                            </div>
                            <div class="role-option" onclick="talentSync.selectRole('client', this)">
                                <i class="fas fa-briefcase"></i>
                                <h4>Hire Freelancers</h4>
                                <p>Post projects and find talent</p>
                            </div>
                        </div>
                        <input type="hidden" name="role" id="selected-role" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" class="form-input" name="fullName" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-input" name="email" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div class="password-input-container">
                            <input type="password" class="form-input" name="password" required minlength="6">
                            <button type="button" class="password-toggle" onclick="talentSync.togglePassword(this)">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="agree-terms" required>
                            <label for="agree-terms">I agree to the Terms of Service and Privacy Policy</label>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Create Account
                    </button>
                </form>
                <div style="text-align: center; margin-top: 1rem;">
                    <p>Already have an account? 
                        <a href="#" onclick="talentSync.showLoginModal()" style="color: var(--primary-color);">Sign in here</a>
                    </p>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    }

    showModal(content) {
        const modalOverlay = document.getElementById('modal-overlay');
        modalOverlay.innerHTML = content;
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        modalOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        setTimeout(() => {
            modalOverlay.innerHTML = '';
        }, 300);
    }

    selectRole(role, element) {
        // Remove selected class from all role options
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selected class to clicked option
        element.classList.add('selected');

        // Set the hidden input value
        document.getElementById('selected-role').value = role;
    }

    togglePassword(button) {
        const input = button.parentElement.querySelector('input');
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    // Authentication Handlers with Firebase Integration
    async handleLogin(event) {
        event.preventDefault();
        console.log('Login form submitted');

        this.showLoading();

        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const remember = formData.get('remember');

        console.log('Login attempt for email:', email);

        // Validate required fields
        if (!email) {
            this.hideLoading();
            this.showToast('Please enter your email address.', 'error');
            return;
        }

        if (!password) {
            this.hideLoading();
            this.showToast('Please enter your password.', 'error');
            return;
        }

        if (this.useFirebase && firebaseService && firebaseService.auth) {
            try {
                console.log('Using Firebase Authentication for login');
                // Use Firebase Authentication
                const result = await firebaseService.signIn(email, password);
                console.log('Firebase login result:', result);

                if (result.success) {
                    console.log('Firebase login successful');
                    // Firebase will handle user state through onAuthStateChanged
                    this.hideLoading();
                    this.closeModal();
                    this.showToast('Login successful! Welcome back.', 'success');

                    // Wait for auth state change to load user profile
                    setTimeout(() => {
                        this.redirectToDashboard();
                    }, 1000);
                } else {
                    console.error('Firebase login failed:', result.error);
                    this.hideLoading();
                    this.showToast(result.error || 'Login failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Firebase login error:', error);
                this.hideLoading();
                this.showToast('Login failed: ' + error.message, 'error');
            }
        } else {
            console.log('Using localStorage fallback for login');
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                this.currentUser = user;
                if (remember) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } else {
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                }

                this.hideLoading();
                this.closeModal();
                this.showToast('Login successful! Welcome back.', 'success');
                this.updateUI();
                this.redirectToDashboard();
            } else {
                this.hideLoading();
                this.showToast('Invalid email or password. Please try again.', 'error');
            }
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        console.log('Signup form submitted');

        this.showLoading();

        const formData = new FormData(event.target);
        const role = formData.get('role');

        console.log('Form data:', {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            role: role,
            password: formData.get('password') ? '***' : 'missing'
        });

        // Validate required fields
        if (!formData.get('fullName')) {
            this.hideLoading();
            this.showToast('Please enter your full name.', 'error');
            return;
        }

        if (!formData.get('email')) {
            this.hideLoading();
            this.showToast('Please enter your email address.', 'error');
            return;
        }

        if (!formData.get('password')) {
            this.hideLoading();
            this.showToast('Please enter a password.', 'error');
            return;
        }

        if (!role) {
            this.hideLoading();
            this.showToast('Please select whether you want to work as a freelancer or hire freelancers.', 'error');
            return;
        }

        const password = formData.get('password');
        if (password.length < 6) {
            this.hideLoading();
            this.showToast('Password must be at least 6 characters long.', 'error');
            return;
        }

        const userData = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            password: password,
            role: role,
            createdAt: new Date().toISOString(),
            profile: {
                bio: '',
                skills: [],
                hourlyRate: role === 'freelancer' ? 50 : null,
                avatar: `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1472099645785-5658abf4ff4e' : '1494790108755-2616b612b786'}?w=150&h=150&fit=crop&crop=face`,
                completedJobs: 0,
                rating: 0,
                reviews: [],
                totalEarnings: 0,
                monthEarnings: 0,
                pendingEarnings: 0,
                activeProjects: 0,
                totalSpent: 0,
                postedJobs: 0,
                hiredFreelancers: 0
            }
        };

        console.log('Attempting signup with Firebase:', this.useFirebase && firebaseService);

        if (this.useFirebase && firebaseService && firebaseService.auth) {
            try {
                console.log('Using Firebase Authentication');
                // Use Firebase Authentication
                const result = await firebaseService.signUp(userData.email, userData.password, userData);
                console.log('Firebase signup result:', result);

                if (result.success) {
                    console.log('Firebase signup successful');
                    this.hideLoading();
                    this.closeModal();
                    this.showToast('Account created successfully! Welcome to TalentSync.', 'success');

                    // Wait for auth state change to update currentUser
                    setTimeout(() => {
                        this.showProfileSetupModal();
                    }, 1000);
                } else {
                    console.error('Firebase signup failed:', result.error);
                    this.hideLoading();
                    this.showToast(result.error || 'Signup failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Firebase signup error:', error);
                this.hideLoading();
                this.showToast('Signup failed: ' + error.message, 'error');
            }
        } else {
            console.log('Using localStorage fallback');
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');

            // Check if email already exists
            if (users.find(u => u.email === userData.email)) {
                this.hideLoading();
                this.showToast('Email already exists. Please use a different email.', 'error');
                return;
            }

            userData.id = Date.now();
            users.push(userData);
            localStorage.setItem('users', JSON.stringify(users));

            this.currentUser = userData;
            sessionStorage.setItem('currentUser', JSON.stringify(userData));

            this.hideLoading();
            this.closeModal();
            this.showToast('Account created successfully! Welcome to TalentSync.', 'success');
            this.updateUI();
            this.showProfileSetupModal();
        }
    }

    showProfileSetupModal() {
        const isFreelancer = this.currentUser.role === 'freelancer';

        const modalHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Complete Your Profile</h2>
                </div>
                <form id="profile-setup-form" onsubmit="talentSync.handleProfileSetup(event)">
                    <div class="form-group">
                        <label class="form-label">Professional Bio</label>
                        <textarea class="form-input" name="bio" rows="4" placeholder="Tell us about yourself and your experience..."></textarea>
                    </div>
                    ${isFreelancer ? `
                        <div class="form-group">
                            <label class="form-label">Skills (comma separated)</label>
                            <input type="text" class="form-input" name="skills" placeholder="e.g., JavaScript, React, Node.js">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Hourly Rate ($)</label>
                            <input type="number" class="form-input" name="hourlyRate" min="5" max="500" value="50">
                        </div>
                    ` : ''}
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Complete Profile
                    </button>
                </form>
            </div>
        `;

        this.showModal(modalHTML);
    }

    async handleProfileSetup(event) {
        event.preventDefault();
        console.log('Profile setup form submitted');

        this.showLoading();

        const formData = new FormData(event.target);
        const bio = formData.get('bio');
        const skills = formData.get('skills');
        const hourlyRate = formData.get('hourlyRate');

        console.log('Profile setup data:', { bio, skills, hourlyRate });

        // Update user profile instantly
        if (this.currentUser) {
            this.currentUser.profile.bio = bio;
            if (skills) {
                this.currentUser.profile.skills = skills.split(',').map(s => s.trim()).filter(s => s);
            }
            if (hourlyRate) {
                this.currentUser.profile.hourlyRate = parseInt(hourlyRate);
            }

            if (this.useFirebase && firebaseService && this.currentUser.uid) {
                try {
                    console.log('Updating profile in Firebase...');

                    // Update user profile in users collection
                    const result = await firebaseService.saveUserProfile(this.currentUser.uid, this.currentUser);

                    if (result.success) {
                        console.log('User profile updated in Firebase');

                        // If user is a freelancer, also update freelancers collection
                        if (this.currentUser.role === 'freelancer') {
                            console.log('Updating freelancer profile...');
                            try {
                                // Find and update the freelancer document
                                const freelancersSnapshot = await firebaseService.db.collection('freelancers')
                                    .where('uid', '==', this.currentUser.uid)
                                    .get();

                                if (!freelancersSnapshot.empty) {
                                    const freelancerDoc = freelancersSnapshot.docs[0];
                                    const freelancerData = {
                                        name: this.currentUser.fullName,
                                        bio: bio,
                                        skills: this.currentUser.profile.skills || [],
                                        hourlyRate: this.currentUser.profile.hourlyRate || 50,
                                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                    };

                                    await freelancerDoc.ref.update(freelancerData);
                                    console.log('Freelancer profile updated successfully');
                                }
                            } catch (freelancerError) {
                                console.error('Failed to update freelancer profile:', freelancerError);
                                // Don't fail the profile setup if freelancer update fails
                            }
                        }

                        this.hideLoading();
                        this.closeModal();
                        this.showToast('Profile setup completed!', 'success');
                        this.redirectToDashboard();
                    } else {
                        console.error('Failed to update profile in Firebase:', result.error);
                        this.hideLoading();
                        this.showToast('Failed to update profile. Please try again.', 'error');
                    }
                } catch (error) {
                    console.error('Profile setup error:', error);
                    this.hideLoading();
                    this.showToast('Profile setup failed: ' + error.message, 'error');
                }
            } else {
                console.log('Using localStorage fallback for profile setup');
                // Fallback to localStorage
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const userIndex = users.findIndex(u => u.id === this.currentUser.id);
                if (userIndex !== -1) {
                    users[userIndex] = this.currentUser;
                    localStorage.setItem('users', JSON.stringify(users));
                }

                sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));

                this.hideLoading();
                this.closeModal();
                this.showToast('Profile setup completed!', 'success');
                this.redirectToDashboard();
            }
        } else {
            console.error('No current user found for profile setup');
            this.hideLoading();
            this.showToast('Error: No user session found. Please try logging in again.', 'error');
        }
    }

    // User Session Management
    loadUserSession() {
        console.log('Loading user session...');

        // Check if Firebase Auth has a current user
        if (this.useFirebase && firebaseService && firebaseService.auth) {
            const firebaseUser = firebaseService.auth.currentUser;
            if (firebaseUser) {
                console.log('Firebase user found:', firebaseUser.uid);
                // Firebase will handle loading the user profile through onAuthStateChanged
                this.loadTheme();
                this.updateLanguageSettings();
                return;
            }
        }

        // Fallback to localStorage/sessionStorage
        const sessionUser = sessionStorage.getItem('currentUser');
        const localUser = localStorage.getItem('currentUser');

        if (sessionUser) {
            console.log('Loading user from session storage');
            this.currentUser = JSON.parse(sessionUser);
        } else if (localUser) {
            console.log('Loading user from local storage');
            this.currentUser = JSON.parse(localUser);
            sessionStorage.setItem('currentUser', localUser);
        } else {
            console.log('No user session found');
        }

        this.loadTheme();
        this.updateLanguageSettings();
    }

    updateLanguageSettings() {
        const savedLanguage = localStorage.getItem('language') || 'en';
        this.currentLanguage = savedLanguage;
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = savedLanguage;
        }
        this.updateLanguageContent();
    }

    async logout() {
        console.log('Logging out user...');

        // Clear local user data
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('currentUser');

        // Sign out from Firebase if available
        if (this.useFirebase && firebaseService && firebaseService.auth) {
            try {
                await firebaseService.signOut();
                console.log('Firebase logout successful');
            } catch (error) {
                console.error('Firebase logout error:', error);
            }
        }

        this.updateUI();
        this.showToast('Logged out successfully', 'success');
        this.navigateToHome();
    }

    // UI Updates
    updateUI() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.updateUI());
            return;
        }

        const navbar = document.querySelector('#nav-actions');

        if (!navbar) {
            console.warn('Navbar element not found, retrying...');
            setTimeout(() => this.updateUI(), 100);
            return;
        }

        // Update theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            // Remove existing listeners and add new one
            const newThemeToggle = themeToggle.cloneNode(true);
            themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);
            newThemeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Update language selector
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.onchange = (e) => this.changeLanguage(e.target.value);
            languageSelect.value = this.currentLanguage;
        }

        if (this.currentUser) {
            // Remove login/signup buttons if they exist
            const loginBtn = document.getElementById('login-btn');
            const signupBtn = document.getElementById('signup-btn');
            if (loginBtn) loginBtn.remove();
            if (signupBtn) signupBtn.remove();

            // Remove existing user menu if it exists (prevent duplicates)
            const existingUserMenu = navbar.querySelector('.user-menu');
            if (existingUserMenu) existingUserMenu.remove();

            // Add user-specific elements
            const userElements = document.createElement('div');
            userElements.innerHTML = `
                <div class="user-menu">
                    <div class="user-info-display">
                        <span class="user-name-display">${this.currentUser.fullName || 'User'}</span>
                        <div class="user-avatar" onclick="talentSync.toggleUserMenu()">
                            <img src="${this.currentUser.profile.avatar}" alt="${this.currentUser.fullName}">
                            <div class="online-indicator"></div>
                        </div>
                    </div>
                    <div class="user-dropdown" id="user-dropdown">
                        <div class="dropdown-header">
                            <img src="${this.currentUser.profile.avatar}" alt="${this.currentUser.fullName}">
                            <div class="user-info">
                                <h4>${this.currentUser.fullName}</h4>
                                <p>${this.currentUser.role}</p>
                            </div>
                        </div>
                        <div class="dropdown-menu">
                            <a href="dashboard.html" class="dropdown-item">
                                <i class="fas fa-tachometer-alt"></i>
                                Dashboard
                            </a>
                            ${this.currentUser.role === 'client' ? `
                                <a href="post-job.html" class="dropdown-item">
                                    <i class="fas fa-plus"></i>
                                    Post a Job
                                </a>
                            ` : ''}
                            <a href="#" onclick="talentSync.showProfileModal()" class="dropdown-item">
                                <i class="fas fa-user"></i>
                                View Profile
                            </a>
                            <a href="#" onclick="talentSync.showEditProfileModal()" class="dropdown-item">
                                <i class="fas fa-edit"></i>
                                Edit Profile
                            </a>
                            <a href="messages.html" class="dropdown-item">
                                <i class="fas fa-envelope"></i>
                                Messages
                            </a>
                            <div class="dropdown-divider"></div>
                            <a href="#" onclick="talentSync.showSettings()" class="dropdown-item">
                                <i class="fas fa-cog"></i>
                                Settings
                            </a>
                            <a href="#" onclick="talentSync.logout()" class="dropdown-item">
                                <i class="fas fa-sign-out-alt"></i>
                                Logout
                            </a>
                        </div>
                    </div>
                </div>
            `;

            // Append user elements to navbar
            navbar.appendChild(userElements);
        } else {
            // Remove user elements if they exist
            const userMenu = document.querySelector('.user-menu');

            if (userMenu) userMenu.remove();

            // Add login/signup buttons if they don't exist
            if (!document.getElementById('login-btn')) {
                const loginBtn = document.createElement('button');
                loginBtn.className = 'btn btn-outline';
                loginBtn.id = 'login-btn';
                loginBtn.textContent = 'Log In';
                loginBtn.onclick = () => this.showLoginModal();
                navbar.appendChild(loginBtn);
            }

            if (!document.getElementById('signup-btn')) {
                const signupBtn = document.createElement('button');
                signupBtn.className = 'btn btn-primary';
                signupBtn.id = 'signup-btn';
                signupBtn.textContent = 'Sign Up';
                signupBtn.onclick = () => this.showSignupModal();
                navbar.appendChild(signupBtn);
            }
        }

        // Reload theme after UI update (but don't override current theme)
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme) {
            this.updateAllThemeIcons(currentTheme);
        } else {
            this.loadTheme();
        }
    }

    // Navigation
    redirectToDashboard() {
        if (this.currentUser.role === 'freelancer') {
            this.showFreelancerDashboard();
        } else {
            this.showClientDashboard();
        }
    }

    navigateToHome() {
        // Check if we're on the main index.html page
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        
        if (currentPage === 'index.html' || currentPage === '') {
            // We're on the home page, just hide other sections and show home
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });

            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.style.display = 'block';
            }

            this.currentPage = 'home';
        } else {
            // We're on a different page (dashboard, browse-jobs, etc.), redirect to home
            console.log('Redirecting to home page from:', currentPage);
            window.location.href = 'index.html';
        }
    }

    // Dashboard Functions
    showFreelancerDashboard() {
        this.showToast('Redirecting to Freelancer Dashboard...', 'info');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }

    showClientDashboard() {
        this.showToast('Redirecting to Client Dashboard...', 'info');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }

    // Utility Functions
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'fas fa-check-circle' :
            type === 'error' ? 'fas fa-exclamation-circle' :
                'fas fa-info-circle';

        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showLoading() {
        const loadingSpinner = document.getElementById('loading-spinner');
        loadingSpinner.classList.add('active');
    }

    hideLoading() {
        const loadingSpinner = document.getElementById('loading-spinner');
        loadingSpinner.classList.remove('active');
    }

    // Debug Functions for Firebase Testing
    async testFirebaseConnection() {
        console.log('=== TESTING FIREBASE CONNECTION ===');

        if (!firebaseService) {
            console.error('Firebase service not available');
            return false;
        }

        try {
            // Test Firebase initialization
            console.log('Firebase app:', firebaseService.app);
            console.log('Firebase auth:', firebaseService.auth);
            console.log('Firebase db:', firebaseService.db);

            // Test data loading
            const debugResult = await firebaseService.debugDataLoading();
            console.log('Debug result:', debugResult);

            this.showToast('Firebase connection test completed - check console', 'info');
            return true;
        } catch (error) {
            console.error('Firebase connection test failed:', error);
            this.showToast('Firebase connection test failed - check console', 'error');
            return false;
        }
    }

    // Debug function to test dashboard access
    testDashboardAccess() {
        console.log('=== TESTING DASHBOARD ACCESS ===');
        console.log('Current user:', this.currentUser);
        console.log('Firebase user:', firebaseService?.auth?.currentUser);
        console.log('Session storage:', sessionStorage.getItem('currentUser'));
        console.log('Local storage:', localStorage.getItem('currentUser'));

        if (this.currentUser) {
            console.log('User is authenticated, dashboard should be accessible');
            this.showToast('User authenticated - dashboard access should work', 'success');
            return true;
        } else {
            console.log('No user found - dashboard will redirect to login');
            this.showToast('No user authenticated - please log in first', 'error');
            return false;
        }
    }

    // Debug function to test post job access
    testPostJobAccess() {
        console.log('=== TESTING POST JOB ACCESS ===');
        console.log('Current user:', this.currentUser);

        if (this.currentUser) {
            console.log('User role:', this.currentUser.role);

            if (this.currentUser.role === 'client') {
                console.log('User is a client - post job should be accessible');
                this.showToast('Client authenticated - post job access should work', 'success');
                return true;
            } else if (this.currentUser.role === 'freelancer') {
                console.log('User is a freelancer - post job will redirect to dashboard');
                this.showToast('Freelancers cannot post jobs - will redirect to dashboard', 'info');
                return false;
            } else {
                console.log('Unknown user role:', this.currentUser.role);
                this.showToast('Unknown user role - check user data', 'error');
                return false;
            }
        } else {
            console.log('No user found - post job will redirect to login');
            this.showToast('No user authenticated - please log in first', 'error');
            return false;
        }
    }

    // Force dashboard navigation (for testing)
    forceDashboardNavigation() {
        if (this.currentUser) {
            console.log('Forcing dashboard navigation...');
            window.location.href = 'dashboard.html';
        } else {
            this.showToast('Please log in first', 'error');
        }
    }

    // Debug function to test category browsing
    testCategoryBrowsing() {
        console.log('=== TESTING CATEGORY BROWSING ===');

        const categories = [
            'Web Development',
            'Mobile Development',
            'Graphic Design',
            'Content Writing',
            'Digital Marketing',
            'Video & Animation',
            'Data Science'
        ];

        categories.forEach(category => {
            console.log(`Testing: ${category}`);
            this.browseCategory(category);
            const stored = sessionStorage.getItem('selectedCategory');
            console.log(`Stored in sessionStorage: ${stored}`);
            sessionStorage.removeItem('selectedCategory'); // Clean up
        });
    }

    // Force post job navigation (for testing)
    forcePostJobNavigation() {
        if (this.currentUser) {
            if (this.currentUser.role === 'client') {
                console.log('Forcing post job navigation...');
                window.location.href = 'post-job.html';
            } else {
                this.showToast('Only clients can post jobs', 'error');
            }
        } else {
            this.showToast('Please log in first', 'error');
        }
    }

    // Demo Data Initialization
    initializeDemoData() {
        // Initialize with some demo users if none exist
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');

        if (existingUsers.length === 0) {
            this.createDemoUsers();
        }
    }

    // Create demo users for testing
    createDemoUsers() {
        const demoUsers = [
            {
                id: 1,
                uid: 'demo-client-1',
                fullName: 'John Client',
                email: 'client@demo.com',
                password: 'password123',
                role: 'client',
                createdAt: new Date().toISOString(),
                profile: {
                    bio: 'Startup founder looking for talented developers',
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                    completedJobs: 15,
                    rating: 4.8,
                    reviews: [],
                    totalEarnings: 0,
                    monthEarnings: 0,
                    pendingEarnings: 0,
                    activeProjects: 0,
                    totalSpent: 25000,
                    postedJobs: 8,
                    hiredFreelancers: 12
                }
            },
            {
                id: 2,
                uid: 'demo-freelancer-1',
                fullName: 'Jane Freelancer',
                email: 'freelancer@demo.com',
                password: 'password123',
                role: 'freelancer',
                createdAt: new Date().toISOString(),
                profile: {
                    bio: 'Full-stack developer with 5+ years experience',
                    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
                    hourlyRate: 75,
                    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
                    completedJobs: 89,
                    rating: 4.9,
                    reviews: [],
                    totalEarnings: 45000,
                    monthEarnings: 3500,
                    pendingEarnings: 1200,
                    activeProjects: 3,
                    totalSpent: 0,
                    postedJobs: 0,
                    hiredFreelancers: 0
                }
            },
            {
                id: 3,
                uid: 'demo-client-2',
                fullName: 'Mike Business',
                email: 'mike@business.com',
                password: 'password123',
                role: 'client',
                createdAt: new Date().toISOString(),
                profile: {
                    bio: 'Small business owner needing digital solutions',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
                    completedJobs: 8,
                    rating: 4.6,
                    reviews: [],
                    totalEarnings: 0,
                    monthEarnings: 0,
                    pendingEarnings: 0,
                    activeProjects: 0,
                    totalSpent: 12000,
                    postedJobs: 5,
                    hiredFreelancers: 6
                }
            },
            {
                id: 4,
                uid: 'demo-freelancer-2',
                fullName: 'Sarah Designer',
                email: 'sarah@design.com',
                password: 'password123',
                role: 'freelancer',
                createdAt: new Date().toISOString(),
                profile: {
                    bio: 'Creative UI/UX designer with passion for user experience',
                    skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Prototyping'],
                    hourlyRate: 65,
                    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
                    completedJobs: 67,
                    rating: 4.8,
                    reviews: [],
                    totalEarnings: 32000,
                    monthEarnings: 2800,
                    pendingEarnings: 800,
                    activeProjects: 2,
                    totalSpent: 0,
                    postedJobs: 0,
                    hiredFreelancers: 0
                }
            }
        ];

        localStorage.setItem('users', JSON.stringify(demoUsers));
        console.log('Demo users created:', demoUsers.length);
        return demoUsers;
    }

    // Get demo users for testing
    getDemoUsers() {
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.length === 0) {
            users = this.createDemoUsers();
        }
        return users;
    }

    // Search and Browse Functions
    performSearch(query) {
        if (query.trim()) {
            // Store search query for use on other pages
            sessionStorage.setItem('searchQuery', query.trim());
            sessionStorage.setItem('searchType', 'jobs');

            this.showToast(`Searching for: ${query}`, 'info');

            // Redirect to browse jobs page with search
            setTimeout(() => {
                window.location.href = 'browse-jobs.html';
            }, 500);
        }
    }

    browseCategory(category) {
        // Map category titles to filter values
        const categoryMapping = {
            'Web Development': 'web-development',
            'Mobile Development': 'mobile-development',
            'Graphic Design': 'design',
            'Content Writing': 'writing',
            'Digital Marketing': 'marketing',
            'Video & Animation': 'video-editing',
            'Data Science': 'data-science',
            'Voice & Audio': 'translation'
        };

        // Get the filter value for the category
        const filterValue = categoryMapping[category] || category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');

        console.log(`Browsing category: ${category} -> ${filterValue}`);

        // Store category for filtering on browse page
        sessionStorage.setItem('selectedCategory', filterValue);

        this.showToast(`Browsing ${category} projects`, 'info');

        // Redirect to browse jobs page with category filter
        setTimeout(() => {
            window.location.href = 'browse-jobs.html';
        }, 500);
    }

    viewFreelancerProfile(freelancerId) {
        // Store freelancer ID for viewing on freelancers page
        sessionStorage.setItem('viewFreelancerId', freelancerId);

        this.showToast(`Viewing freelancer profile #${freelancerId}`, 'info');

        // Redirect to freelancers page
        setTimeout(() => {
            window.location.href = 'freelancers.html';
        }, 500);
    }

    // User Menu Functions
    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                dropdown?.classList.remove('show');
            }
        });
    }

    showNotifications() {
        // Get real notifications data
        const notifications = this.getNotifications();

        if (notifications.length === 0) {
            this.showToast('No new notifications', 'info');
            return;
        }

        const modalHTML = `
            <div class="modal notifications-modal">
                <div class="modal-header">
                    <h2 class="modal-title">Notifications</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="notifications-list">
                        ${notifications.map(notification => `
                            <div class="notification-item ${notification.read ? '' : 'unread'}">
                                <div class="notification-icon ${notification.type}">
                                    <i class="${notification.icon}"></i>
                                </div>
                                <div class="notification-content">
                                    <h4>${notification.title}</h4>
                                    <p>${notification.message}</p>
                                    <small>${this.formatDate(notification.date)}</small>
                                </div>
                                ${!notification.read ? '<div class="unread-indicator"></div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="notifications-actions">
                        <button class="btn btn-outline" onclick="talentSync.markAllNotificationsRead()">
                            Mark All as Read
                        </button>
                        <button class="btn btn-primary" onclick="talentSync.closeModal()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    }

    getNotifications() {
        if (!this.currentUser) return [];

        const notifications = [];

        // Get proposals for freelancers
        if (this.currentUser.role === 'freelancer') {
            const proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
            const userProposals = proposals.filter(p => p.freelancerId === this.currentUser.id);

            userProposals.forEach(proposal => {
                if (proposal.status === 'accepted') {
                    notifications.push({
                        id: `proposal_${proposal.id}`,
                        type: 'success',
                        icon: 'fas fa-check-circle',
                        title: 'Proposal Accepted!',
                        message: `Your proposal for "${proposal.jobTitle || 'a project'}" has been accepted.`,
                        date: proposal.updatedDate || proposal.submittedDate,
                        read: false
                    });
                }
            });

            // Get hire requests
            const hireRequests = JSON.parse(localStorage.getItem('hireRequests') || '[]');
            const userHires = hireRequests.filter(h => h.freelancerId === this.currentUser.id);

            userHires.forEach(hire => {
                notifications.push({
                    id: `hire_${hire.id}`,
                    type: 'info',
                    icon: 'fas fa-handshake',
                    title: 'New Hire Request',
                    message: `${hire.clientName} wants to hire you for "${hire.projectTitle}".`,
                    date: hire.sentDate,
                    read: false
                });
            });
        }

        // Get job applications for clients
        if (this.currentUser.role === 'client') {
            const proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
            const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
            const userJobs = jobs.filter(j => j.clientId === this.currentUser.id);

            userJobs.forEach(job => {
                const jobProposals = proposals.filter(p => p.jobId === job.id);
                jobProposals.forEach(proposal => {
                    notifications.push({
                        id: `proposal_${proposal.id}`,
                        type: 'info',
                        icon: 'fas fa-paper-plane',
                        title: 'New Proposal Received',
                        message: `${proposal.freelancerName} submitted a proposal for "${job.title}".`,
                        date: proposal.submittedDate,
                        read: false
                    });
                });
            });
        }

        // Sort by date (newest first)
        return notifications.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    }

    markAllNotificationsRead() {
        // In a real app, this would update the database
        this.showToast('All notifications marked as read', 'success');
        this.closeModal();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    showProfileModal() {
        if (!this.currentUser) return;

        const modalHTML = `
            <div class="modal profile-view-modal">
                <div class="modal-header">
                    <h2 class="modal-title">My Profile</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="profile-view-content">
                        <div class="profile-header">
                            <div class="profile-avatar-large">
                                <img src="${this.currentUser.profile.avatar}" alt="${this.currentUser.fullName}">
                            </div>
                            <div class="profile-info">
                                <h3>${this.currentUser.fullName}</h3>
                                <p class="profile-role">${this.currentUser.role}</p>
                                <p class="profile-email">${this.currentUser.email}</p>
                                ${this.currentUser.profile.rating ? `
                                    <div class="profile-rating">
                                        <div class="stars">${this.generateStars(this.currentUser.profile.rating)}</div>
                                        <span>${this.currentUser.profile.rating} (${this.currentUser.profile.reviews?.length || 0} reviews)</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="profile-details">
                            <div class="detail-section">
                                <h4>About</h4>
                                <p>${this.currentUser.profile.bio || 'No bio available'}</p>
                            </div>
                            
                            ${this.currentUser.profile.skills && this.currentUser.profile.skills.length > 0 ? `
                                <div class="detail-section">
                                    <h4>Skills</h4>
                                    <div class="skills-display">
                                        ${this.currentUser.profile.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${this.currentUser.profile.hourlyRate ? `
                                <div class="detail-section">
                                    <h4>Hourly Rate</h4>
                                    <p class="hourly-rate">$${this.currentUser.profile.hourlyRate}/hr</p>
                                </div>
                            ` : ''}
                            
                            <div class="detail-section">
                                <h4>Statistics</h4>
                                <div class="stats-grid">
                                    <div class="stat-item">
                                        <span class="stat-value">${this.currentUser.profile.completedJobs || 0}</span>
                                        <span class="stat-label">Jobs Completed</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-value">${this.currentUser.profile.totalEarnings || 0}</span>
                                        <span class="stat-label">Total Earnings</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="profile-actions">
                            <button class="btn btn-primary" onclick="talentSync.showEditProfileModal()">
                                <i class="fas fa-edit"></i> Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    }

    showEditProfileModal() {
        if (!this.currentUser) return;

        const modalHTML = `
            <div class="modal edit-profile-modal">
                <div class="modal-header">
                    <h2 class="modal-title">Edit Profile</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="edit-profile-form" onsubmit="talentSync.handleProfileUpdate(event)">
                        <div class="form-group">
                            <label class="form-label">Profile Picture</label>
                            <div class="avatar-upload-section">
                                <div class="current-avatar">
                                    <img src="${this.currentUser.profile.avatar}" alt="Current Avatar" id="preview-avatar">
                                </div>
                                <div class="upload-controls">
                                    <input type="file" id="avatar-upload" accept="image/*" style="display: none;" onchange="talentSync.previewAvatar(event)">
                                    <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('avatar-upload').click()">
                                        <i class="fas fa-camera"></i> Change Photo
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-input" name="fullName" value="${this.currentUser.fullName}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" name="email" value="${this.currentUser.email}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Bio</label>
                            <textarea class="form-input" name="bio" rows="4" placeholder="Tell us about yourself...">${this.currentUser.profile.bio || ''}</textarea>
                        </div>
                        
                        ${this.currentUser.role === 'freelancer' ? `
                            <div class="form-group">
                                <label class="form-label">Skills (comma separated)</label>
                                <input type="text" class="form-input" name="skills" value="${this.currentUser.profile.skills?.join(', ') || ''}" placeholder="e.g., JavaScript, React, Node.js">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Hourly Rate ($)</label>
                                <input type="number" class="form-input" name="hourlyRate" min="5" max="500" value="${this.currentUser.profile.hourlyRate || 50}">
                            </div>
                        ` : ''}
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="talentSync.closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.showModal(modalHTML);
    }

    previewAvatar(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('preview-avatar').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    async handleProfileUpdate(event) {
        event.preventDefault();
        this.showLoading();

        const formData = new FormData(event.target);

        // Update user data
        this.currentUser.fullName = formData.get('fullName');
        this.currentUser.email = formData.get('email');
        this.currentUser.profile.bio = formData.get('bio');

        if (this.currentUser.role === 'freelancer') {
            const skills = formData.get('skills');
            if (skills) {
                this.currentUser.profile.skills = skills.split(',').map(s => s.trim()).filter(s => s);
            }

            const hourlyRate = formData.get('hourlyRate');
            if (hourlyRate) {
                this.currentUser.profile.hourlyRate = parseInt(hourlyRate);
            }
        }

        // Handle avatar upload
        const avatarFile = document.getElementById('avatar-upload').files[0];
        if (avatarFile) {
            // In a real app, you'd upload to Firebase Storage
            this.currentUser.profile.avatar = document.getElementById('preview-avatar').src;
        }

        if (this.useFirebase && firebaseService && this.currentUser.uid) {
            // Update in Firebase
            const result = await firebaseService.saveUserProfile(this.currentUser.uid, this.currentUser);
            if (result.success) {
                this.hideLoading();
                this.closeModal();
                this.showToast('Profile updated successfully!', 'success');
                this.updateUI();
            } else {
                this.hideLoading();
                this.showToast('Failed to update profile. Please try again.', 'error');
            }
        } else {
            // Update in localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                users[userIndex] = this.currentUser;
                localStorage.setItem('users', JSON.stringify(users));
            }

            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            this.hideLoading();
            this.closeModal();
            this.showToast('Profile updated successfully!', 'success');
            this.updateUI();
        }
    }

    async logout() {
        if (this.useFirebase && firebaseService) {
            const result = await firebaseService.signOut();
            if (result.success) {
                this.currentUser = null;
                this.showToast('Logged out successfully', 'success');
                this.navigateToHome();
            }
        } else {
            // Fallback to localStorage
            this.currentUser = null;
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('currentUser');
            this.updateUI();
            this.showToast('Logged out successfully', 'success');
            this.navigateToHome();
        }
    }

    showSettings() {
        this.showToast('Settings page coming soon!', 'info');
    }

    // Footer Support Functions
    showHelpCenter() {
        const modalHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Help Center</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="help-content">
                        <h3>Frequently Asked Questions</h3>
                        
                        <div class="faq-item">
                            <h4>How do I get started as a freelancer?</h4>
                            <p>Sign up for a freelancer account, complete your profile with your skills and experience, then start browsing and applying to jobs that match your expertise.</p>
                        </div>
                        
                        <div class="faq-item">
                            <h4>How do I post a job as a client?</h4>
                            <p>Create a client account, click "Post a Job", fill in your project details, budget, and requirements. Freelancers will then submit proposals for your review.</p>
                        </div>
                        
                        <div class="faq-item">
                            <h4>How does payment work?</h4>
                            <p>TalentSync uses a secure escrow system. Clients fund projects upfront, and payments are released to freelancers upon completion of milestones.</p>
                        </div>
                        
                        <div class="faq-item">
                            <h4>What if I have a dispute?</h4>
                            <p>Our dispute resolution team helps resolve conflicts fairly. Contact support if you encounter any issues with a project or payment.</p>
                        </div>
                        
                        <div class="help-actions">
                            <button class="btn btn-primary" onclick="talentSync.closeModal()">Got it</button>
                            <button class="btn btn-outline" onclick="talentSync.showContactUs()">Contact Support</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.showModal(modalHTML);
    }

    showContactUs() {
        const modalHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Contact Us</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="contact-content">
                        <div class="contact-methods">
                            <div class="contact-method">
                                <i class="fas fa-envelope"></i>
                                <h4>Email Support</h4>
                                <p>support@talentsync.com</p>
                                <small>We typically respond within 24 hours</small>
                            </div>
                            
                            <div class="contact-method">
                                <i class="fas fa-phone"></i>
                                <h4>Phone Support</h4>
                                <p>1-800-TALENT-1</p>
                                <small>Monday - Friday, 9 AM - 6 PM EST</small>
                            </div>
                            
                            <div class="contact-method">
                                <i class="fas fa-comments"></i>
                                <h4>Live Chat</h4>
                                <p>Available 24/7</p>
                                <button class="btn btn-sm btn-primary" onclick="talentSync.startLiveChat()">Start Chat</button>
                            </div>
                        </div>
                        
                        <div class="contact-form">
                            <h4>Send us a message</h4>
                            <form onsubmit="talentSync.submitContactForm(event)">
                                <div class="form-group">
                                    <label class="form-label">Subject</label>
                                    <select class="form-input" name="subject" required>
                                        <option value="">Select a topic</option>
                                        <option value="account">Account Issues</option>
                                        <option value="payment">Payment Problems</option>
                                        <option value="technical">Technical Support</option>
                                        <option value="dispute">Dispute Resolution</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Message</label>
                                    <textarea class="form-input" name="message" rows="4" placeholder="Describe your issue or question..." required></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary">Send Message</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.showModal(modalHTML);
    }

    showTrustSafety() {
        const modalHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Trust & Safety</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="trust-safety-content">
                        <div class="safety-section">
                            <h3><i class="fas fa-shield-alt"></i> Our Commitment to Safety</h3>
                            <p>TalentSync is committed to providing a safe and secure platform for all users. We have implemented multiple layers of protection to ensure your safety and security.</p>
                        </div>
                        
                        <div class="safety-features">
                            <div class="safety-feature">
                                <i class="fas fa-user-check"></i>
                                <h4>Identity Verification</h4>
                                <p>All users go through identity verification to ensure authenticity and build trust in our community.</p>
                            </div>
                            
                            <div class="safety-feature">
                                <i class="fas fa-lock"></i>
                                <h4>Secure Payments</h4>
                                <p>Our escrow system protects both clients and freelancers by holding funds securely until work is completed.</p>
                            </div>
                            
                            <div class="safety-feature">
                                <i class="fas fa-star"></i>
                                <h4>Rating System</h4>
                                <p>Our transparent rating and review system helps you make informed decisions about who to work with.</p>
                            </div>
                            
                            <div class="safety-feature">
                                <i class="fas fa-headset"></i>
                                <h4>24/7 Support</h4>
                                <p>Our support team is available around the clock to help resolve any issues or concerns.</p>
                            </div>
                        </div>
                        
                        <div class="safety-tips">
                            <h3>Safety Tips</h3>
                            <ul>
                                <li>Always communicate through TalentSync's messaging system</li>
                                <li>Never share personal financial information</li>
                                <li>Use our secure payment system for all transactions</li>
                                <li>Report suspicious behavior immediately</li>
                                <li>Read reviews and check ratings before hiring or accepting work</li>
                            </ul>
                        </div>
                        
                        <div class="report-section">
                            <h4>Report a Safety Concern</h4>
                            <p>If you encounter any suspicious activity or safety concerns, please report it immediately.</p>
                            <button class="btn btn-danger" onclick="talentSync.reportSafetyConcern()">Report Issue</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.showModal(modalHTML);
    }

    startLiveChat() {
        this.showToast('Live chat feature coming soon! Please use email or phone support for now.', 'info');
    }

    submitContactForm(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const subject = formData.get('subject');
        const message = formData.get('message');
        
        // In a real app, this would send to your backend
        console.log('Contact form submitted:', { subject, message });
        
        this.closeModal();
        this.showToast('Your message has been sent! We\'ll get back to you within 24 hours.', 'success');
    }

    reportSafetyConcern() {
        const modalHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Report Safety Concern</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form onsubmit="talentSync.submitSafetyReport(event)">
                        <div class="form-group">
                            <label class="form-label">Type of Concern</label>
                            <select class="form-input" name="concernType" required>
                                <option value="">Select concern type</option>
                                <option value="fraud">Fraudulent Activity</option>
                                <option value="harassment">Harassment</option>
                                <option value="spam">Spam or Scam</option>
                                <option value="inappropriate">Inappropriate Content</option>
                                <option value="payment">Payment Issues</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">User/Project Involved (if applicable)</label>
                            <input type="text" class="form-input" name="involvedParty" placeholder="Username or project title">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-input" name="description" rows="4" placeholder="Please provide details about the safety concern..." required></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="talentSync.closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-danger">Submit Report</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        this.showModal(modalHTML);
    }

    submitSafetyReport(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const concernType = formData.get('concernType');
        const involvedParty = formData.get('involvedParty');
        const description = formData.get('description');
        
        // In a real app, this would send to your backend security team
        console.log('Safety report submitted:', { concernType, involvedParty, description });
        
        this.closeModal();
        this.showToast('Safety report submitted. Our team will investigate immediately.', 'success');
    }
}

// Initialize the application
const talentSync = new TalentSync();

// Make it globally available for onclick handlers
window.talentSync = talentSync;
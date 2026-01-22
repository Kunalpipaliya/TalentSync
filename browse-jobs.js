// Browse Jobs JavaScript with Firebase Integration
class JobBrowser {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.currentPage = 1;
        this.jobsPerPage = 10;
        this.currentFilters = {
            search: '',
            location: '',
            category: [],
            budget: [],
            experience: [],
            duration: [],
            type: []
        };
        this.currentSort = 'newest';
        
        this.init();
    }

    init() {
        // Wait for talentSync to be initialized and Firebase to be ready
        if (typeof talentSync !== 'undefined') {
            console.log('JobBrowser: TalentSync available, initializing...');
            // Initialize navigation first
            this.setupNavigation();
            
            // Setup event listeners first
            this.setupEventListeners();
            this.populateCategories();
            
            // Wait for Firebase to be ready, then load jobs
            this.waitForFirebaseAndLoadJobs();
            
            // Listen for user loaded event to re-render with correct buttons
            window.addEventListener('userLoaded', () => {
                console.log('User loaded, re-rendering jobs with correct role buttons');
                this.displayJobs();
            });
        } else {
            console.log('JobBrowser: Waiting for TalentSync...');
            // Retry after a short delay
            setTimeout(() => this.init(), 200);
        }
    }

    async waitForFirebaseAndLoadJobs() {
        console.log('Waiting for Firebase to be ready...');
        
        let attempts = 0;
        const maxAttempts = 100; // Wait up to 10 seconds
        
        while (attempts < maxAttempts) {
            if (typeof firebaseService !== 'undefined' && firebaseService && firebaseService.db) {
                console.log('Firebase is ready, loading jobs...');
                await this.loadJobsData();
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            
            if (attempts % 20 === 0) {
                console.log(`Still waiting for Firebase... attempt ${attempts}/${maxAttempts}`);
            }
        }
        
        console.log('Firebase initialization timeout, using demo data');
        this.generateDemoJobs();
        this.loadJobs();
        this.handleIncomingSearch();
    }

    async loadJobsData() {
        console.log('Loading jobs data...');
        
        // Check Firebase connection
        if (!this.checkFirebaseConnection()) {
            console.log('Firebase not properly connected, using demo data');
            this.generateDemoJobs();
            this.loadJobs();
            this.handleIncomingSearch();
            return;
        }
        
        try {
            console.log('Loading jobs from Firebase...');
            
            // First, ensure demo data exists
            await this.ensureDemoDataExists();
            
            // Load from Firebase
            const result = await firebaseService.loadJobs();
            console.log('Firebase jobs result:', result);
            
            if (result.success && result.data && result.data.length > 0) {
                this.jobs = result.data;
                console.log(`✅ Loaded ${this.jobs.length} jobs from Firebase`);
                
                // Set up real-time listener for job updates
                this.setupRealtimeJobListener();
            } else {
                console.log('No jobs found in Firebase, creating demo jobs...');
                await this.createAndLoadDemoJobs();
            }
        } catch (error) {
            console.error('Error loading jobs from Firebase:', error);
            console.log('Falling back to demo data...');
            this.generateDemoJobs();
        }
        
        // Load jobs and then handle incoming search/category filters
        this.loadJobs();
        
        // Handle incoming search/category after jobs are loaded
        this.handleIncomingSearch();
    }

    checkFirebaseConnection() {
        if (!firebaseService) {
            console.log('❌ FirebaseService not available');
            return false;
        }
        
        if (!firebaseService.db) {
            console.log('❌ Firestore database not available');
            return false;
        }
        
        if (!firebaseService.auth) {
            console.log('❌ Firebase Auth not available');
            return false;
        }
        
        console.log('✅ Firebase connection verified');
        return true;
    }

    async ensureDemoDataExists() {
        try {
            console.log('Ensuring demo data exists in Firebase...');
            
            // Check if jobs exist
            const jobsSnapshot = await firebaseService.db.collection('jobs').limit(1).get();
            
            if (jobsSnapshot.empty) {
                console.log('No jobs found, initializing demo data...');
                
                // Try to use the Firebase service's demo data creation
                if (firebaseService.initializeDemoData) {
                    await firebaseService.initializeDemoData();
                } else {
                    // Fallback: create demo data directly
                    await this.createDemoJobsInFirebase();
                }
                
                // Wait a bit for the data to be created
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verify data was created
                const verifySnapshot = await firebaseService.db.collection('jobs').limit(1).get();
                if (verifySnapshot.empty) {
                    console.log('⚠️ Demo data creation may have failed');
                } else {
                    console.log('✅ Demo data verified in Firebase');
                }
            } else {
                console.log('✅ Jobs already exist in Firebase');
            }
        } catch (error) {
            console.error('Error ensuring demo data exists:', error);
        }
    }

    async createDemoJobsInFirebase() {
        console.log('Creating demo jobs directly in Firebase...');
        
        const demoJobs = this.getDemoJobsData();
        
        for (const job of demoJobs) {
            try {
                const result = await firebaseService.saveJob(job);
                if (result.success) {
                    console.log(`✅ Created demo job: ${job.title}`);
                } else {
                    console.error(`❌ Failed to create demo job: ${job.title}`, result.error);
                }
            } catch (error) {
                console.error(`❌ Error creating demo job: ${job.title}`, error);
            }
        }
    }

    async createAndLoadDemoJobs() {
        try {
            console.log('Creating demo jobs in Firebase...');
            
            // Create demo jobs directly
            const demoJobs = this.getDemoJobsData();
            
            for (const job of demoJobs) {
                const result = await firebaseService.saveJob(job);
                if (result.success) {
                    console.log(`Created demo job: ${job.title}`);
                } else {
                    console.error(`Failed to create demo job: ${job.title}`, result.error);
                }
            }
            
            // Wait a bit and then reload
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try loading again
            const result = await firebaseService.loadJobs();
            if (result.success && result.data) {
                this.jobs = result.data;
                console.log(`Loaded ${this.jobs.length} jobs after creating demo data`);
            } else {
                console.log('Still no jobs after creating demo data, using local demo jobs');
                this.generateDemoJobs();
            }
        } catch (error) {
            console.error('Error creating demo jobs:', error);
            this.generateDemoJobs();
        }
    }

    getDemoJobsData() {
        return [
            {
                title: 'React Developer Needed for E-commerce Platform',
                description: 'We are looking for an experienced React developer to help build a modern e-commerce platform. The project involves creating responsive components, integrating with APIs, and ensuring optimal performance.',
                category: 'web-development',
                budgetType: 'fixed',
                budgetMin: 2500,
                budgetMax: 3500,
                skills: ['React', 'JavaScript', 'CSS', 'Node.js', 'MongoDB'],
                location: 'Remote',
                experience: 'intermediate',
                duration: 'medium',
                proposals: 8,
                status: 'active',
                clientId: 'demo-client-1',
                clientName: 'TechStart Inc.',
                clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face',
                clientRating: 4.8,
                clientJobsPosted: 12
            },
            {
                title: 'Mobile App UI/UX Design',
                description: 'Looking for a creative designer to create stunning UI/UX designs for our mobile application. Must have experience with modern design principles and mobile-first approach.',
                category: 'design',
                budgetType: 'fixed',
                budgetMin: 1200,
                budgetMax: 2000,
                skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Mobile Design'],
                location: 'Remote',
                experience: 'intermediate',
                duration: 'short',
                proposals: 15,
                status: 'active',
                clientId: 'demo-client-2',
                clientName: 'StartupXYZ',
                clientAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face',
                clientRating: 4.6,
                clientJobsPosted: 5
            },
            {
                title: 'Content Writer for Tech Blog',
                description: 'We need a skilled content writer to create engaging blog posts about technology trends, software development, and digital innovation. Must have excellent research skills.',
                category: 'writing',
                budgetType: 'hourly',
                hourlyMin: 25,
                hourlyMax: 40,
                skills: ['Content Writing', 'SEO', 'Research', 'Technology'],
                location: 'Remote',
                experience: 'intermediate',
                duration: 'long',
                proposals: 22,
                status: 'active',
                clientId: 'demo-client-3',
                clientName: 'Digital Media Co.',
                clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face',
                clientRating: 4.9,
                clientJobsPosted: 8
            },
            {
                title: 'Python Data Analysis Project',
                description: 'Seeking a data scientist to analyze customer behavior data and create insights for business decisions. Experience with pandas, numpy, and visualization libraries required.',
                category: 'data-science',
                budgetType: 'fixed',
                budgetMin: 1800,
                budgetMax: 2500,
                skills: ['Python', 'Data Analysis', 'Pandas', 'Matplotlib', 'Statistics'],
                location: 'Remote',
                experience: 'expert',
                duration: 'medium',
                proposals: 6,
                status: 'active',
                clientId: 'demo-client-4',
                clientName: 'Analytics Pro',
                clientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
                clientRating: 4.7,
                clientJobsPosted: 15
            },
            {
                title: 'WordPress Website Development',
                description: 'Need a WordPress developer to create a business website with custom theme, contact forms, and SEO optimization. Must be responsive and fast-loading.',
                category: 'web-development',
                budgetType: 'fixed',
                budgetMin: 800,
                budgetMax: 1200,
                skills: ['WordPress', 'PHP', 'CSS', 'JavaScript', 'SEO'],
                location: 'Remote',
                experience: 'entry',
                duration: 'short',
                proposals: 18,
                status: 'active',
                clientId: 'demo-client-5',
                clientName: 'Small Business LLC',
                clientAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face',
                clientRating: 4.5,
                clientJobsPosted: 3
            },
            {
                title: 'Social Media Marketing Campaign',
                description: 'Looking for a digital marketing expert to create and manage social media campaigns across multiple platforms. Must have proven track record of engagement growth.',
                category: 'marketing',
                budgetType: 'hourly',
                hourlyMin: 30,
                hourlyMax: 50,
                skills: ['Social Media Marketing', 'Facebook Ads', 'Instagram', 'Content Strategy'],
                location: 'Remote',
                experience: 'intermediate',
                duration: 'long',
                proposals: 12,
                status: 'active',
                clientId: 'demo-client-6',
                clientName: 'Marketing Agency',
                clientAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face',
                clientRating: 4.8,
                clientJobsPosted: 20
            }
        ];
    }

    setupRealtimeJobListener() {
        if (this.jobsListener) {
            this.jobsListener(); // Cleanup existing listener
        }
        
        this.jobsListener = firebaseService.listenToJobs((snapshot) => {
            console.log('Jobs updated in real-time');
            this.jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.loadJobs(); // Refresh the display
        });
    }

    setupNavigation() {
        // Let talentSync handle navigation - ensure it's updated
        if (talentSync) {
            // Force update the UI to show proper login/signup buttons
            setTimeout(() => {
                talentSync.updateUI();
            }, 100);
        }
    }

    generateDemoJobs() {
        this.jobs = [
            {
                id: 1,
                title: 'React Developer Needed for E-commerce Platform',
                description: 'We are looking for an experienced React developer to help build a modern e-commerce platform. The project involves creating responsive components, integrating with APIs, and ensuring optimal performance.',
                category: 'web-development',
                budget: { type: 'fixed', min: 2500, max: 3500 },
                skills: ['React', 'JavaScript', 'CSS', 'Node.js', 'MongoDB'],
                location: 'Remote',
                experience: 'intermediate',
                duration: 'medium',
                proposals: 8,
                postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                client: {
                    name: 'TechStart Inc.',
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face',
                    rating: 4.8,
                    jobsPosted: 12
                }
            },
            {
                id: 2,
                title: 'Mobile App UI/UX Design',
                description: 'Looking for a creative designer to create stunning UI/UX designs for our mobile application. Must have experience with modern design principles and mobile-first approach.',
                category: 'design',
                budget: { type: 'fixed', min: 1200, max: 2000 },
                skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Mobile Design'],
                location: 'Remote',
                experience: 'intermediate',
                duration: 'short',
                proposals: 15,
                postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                client: {
                    name: 'StartupXYZ',
                    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face',
                    rating: 4.6,
                    jobsPosted: 5
                }
            },
            {
                id: 3,
                title: 'Content Writer for Tech Blog',
                description: 'We need a skilled content writer to create engaging blog posts about technology trends, software development, and digital innovation. Must have excellent research skills.',
                category: 'writing',
                budget: { type: 'hourly', min: 25, max: 40 },
                skills: ['Content Writing', 'SEO', 'Research', 'Technology'],
                location: 'Remote',
                experience: 'intermediate',
                duration: 'long',
                proposals: 22,
                postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                client: {
                    name: 'Digital Media Co.',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face',
                    rating: 4.9,
                    jobsPosted: 8
                }
            },
            {
                id: 4,
                title: 'Python Data Analysis Project',
                description: 'Seeking a data scientist to analyze customer behavior data and create insights for business decisions. Experience with pandas, numpy, and visualization libraries required.',
                category: 'data-science',
                budget: { type: 'fixed', min: 1800, max: 2500 },
                skills: ['Python', 'Data Analysis', 'Pandas', 'Matplotlib', 'Statistics'],
                location: 'Remote',
                experience: 'expert',
                duration: 'medium',
                proposals: 6,
                postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                client: {
                    name: 'Analytics Pro',
                    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
                    rating: 4.7,
                    jobsPosted: 15
                }
            },
            {
                id: 5,
                title: 'WordPress Website Development',
                description: 'Need a WordPress developer to create a business website with custom theme, contact forms, and SEO optimization. Must be responsive and fast-loading.',
                category: 'web-development',
                budget: { type: 'fixed', min: 800, max: 1200 },
                skills: ['WordPress', 'PHP', 'CSS', 'JavaScript', 'SEO'],
                location: 'Remote',
                experience: 'entry',
                duration: 'short',
                proposals: 18,
                postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                client: {
                    name: 'Small Business LLC',
                    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face',
                    rating: 4.5,
                    jobsPosted: 3
                }
            },
            {
                id: 6,
                title: 'Social Media Marketing Campaign',
                description: 'Looking for a digital marketing expert to create and manage social media campaigns across multiple platforms. Must have proven track record of engagement growth.',
                category: 'marketing',
                budget: { type: 'hourly', min: 30, max: 50 },
                skills: ['Social Media Marketing', 'Facebook Ads', 'Instagram', 'Content Strategy'],
                location: 'Remote',
                experience: 'intermediate',
                duration: 'long',
                proposals: 12,
                postedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                client: {
                    name: 'Marketing Agency',
                    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face',
                    rating: 4.8,
                    jobsPosted: 20
                }
            }
        ];
        
        console.log(`Generated ${this.jobs.length} demo jobs`);
    }

    populateCategories() {
        const categories = [
            { value: 'web-development', label: 'Web Development' },
            { value: 'mobile-development', label: 'Mobile Development' },
            { value: 'design', label: 'Design & Creative' },
            { value: 'writing', label: 'Writing & Content' },
            { value: 'marketing', label: 'Digital Marketing' },
            { value: 'data-science', label: 'Data Science' },
            { value: 'video-editing', label: 'Video & Animation' },
            { value: 'translation', label: 'Translation' }
        ];

        const categoryFilters = document.getElementById('category-filters');
        if (categoryFilters) {
            categoryFilters.innerHTML = categories.map(category => `
                <label class="filter-option">
                    <input type="checkbox" name="category" value="${category.value}">
                    <span>${category.label}</span>
                </label>
            `).join('');
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners for job filtering...');
        
        // Search functionality
        const jobSearch = document.getElementById('job-search');
        const locationSearch = document.getElementById('location-search');
        
        if (jobSearch) {
            jobSearch.addEventListener('input', this.debounce(() => {
                console.log('Search input changed:', jobSearch.value);
                this.currentFilters.search = jobSearch.value;
                this.applyFilters();
            }, 300));
        }
        
        if (locationSearch) {
            locationSearch.addEventListener('input', this.debounce(() => {
                console.log('Location input changed:', locationSearch.value);
                this.currentFilters.location = locationSearch.value;
                this.applyFilters();
            }, 300));
        }

        // Quick filters (category tags)
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Filter tag clicked:', e.target.dataset.filter);
                
                // Update active state
                document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                const filter = e.target.dataset.filter;
                if (filter === 'all') {
                    this.currentFilters.category = [];
                } else {
                    this.currentFilters.category = [filter];
                }
                
                // Also update sidebar checkboxes to match
                this.updateCategoryCheckboxes(filter);
                
                this.applyFilters();
            });
        });

        // Sidebar filters - set up after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.setupSidebarFilters();
        }, 100);

        // Sort dropdown
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                console.log('Sort changed:', e.target.value);
                this.sortJobs(e.target.value);
            });
        }

        // Proposal form bid calculation
        const bidInput = document.querySelector('input[name="bidAmount"]');
        if (bidInput) {
            bidInput.addEventListener('input', () => {
                this.updateProposalSummary();
            });
        }
    }

    setupSidebarFilters() {
        console.log('Setting up sidebar filters...');
        
        // Category checkboxes
        document.querySelectorAll('input[name="category"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                console.log('Category checkbox changed:', checkbox.value, checkbox.checked);
                this.updateFiltersFromCheckboxes();
                this.applyFilters();
            });
        });

        // Budget checkboxes
        document.querySelectorAll('input[name="budget"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                console.log('Budget checkbox changed:', checkbox.value, checkbox.checked);
                this.updateFiltersFromCheckboxes();
                this.applyFilters();
            });
        });

        // Experience checkboxes
        document.querySelectorAll('input[name="experience"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                console.log('Experience checkbox changed:', checkbox.value, checkbox.checked);
                this.updateFiltersFromCheckboxes();
                this.applyFilters();
            });
        });

        // Duration checkboxes
        document.querySelectorAll('input[name="duration"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                console.log('Duration checkbox changed:', checkbox.value, checkbox.checked);
                this.updateFiltersFromCheckboxes();
                this.applyFilters();
            });
        });

        // Type checkboxes
        document.querySelectorAll('input[name="type"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                console.log('Type checkbox changed:', checkbox.value, checkbox.checked);
                this.updateFiltersFromCheckboxes();
                this.applyFilters();
            });
        });
    }

    updateCategoryCheckboxes(selectedCategory) {
        // Update category checkboxes to match the selected filter tag
        document.querySelectorAll('input[name="category"]').forEach(checkbox => {
            if (selectedCategory === 'all') {
                checkbox.checked = false;
            } else {
                checkbox.checked = checkbox.value === selectedCategory;
            }
        });
    }

    handleIncomingSearch() {
        const searchQuery = sessionStorage.getItem('searchQuery');
        const searchType = sessionStorage.getItem('searchType');
        const selectedCategory = sessionStorage.getItem('selectedCategory');
        
        console.log('Browse Jobs: Handling incoming search/category');
        console.log('Search query:', searchQuery);
        console.log('Search type:', searchType);
        console.log('Selected category:', selectedCategory);
        
        if (searchQuery && searchType === 'jobs') {
            const jobSearch = document.getElementById('job-search');
            if (jobSearch) {
                jobSearch.value = searchQuery;
                this.currentFilters.search = searchQuery;
            }
            sessionStorage.removeItem('searchQuery');
            sessionStorage.removeItem('searchType');
            this.applyFilters();
        }
        
        if (selectedCategory) {
            console.log('Applying incoming category filter:', selectedCategory);
            
            // Update filter tags
            document.querySelectorAll('.filter-tag').forEach(tag => {
                tag.classList.remove('active');
                if (tag.dataset.filter === selectedCategory) {
                    tag.classList.add('active');
                }
            });
            sessionStorage.removeItem('selectedCategory');
            this.applyFilters();
        }
    }

    updateFiltersFromCheckboxes() {
        // Category checkboxes
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
        this.currentFilters.category = Array.from(categoryCheckboxes).map(cb => cb.value);

        // Budget checkboxes
        const budgetCheckboxes = document.querySelectorAll('input[name="budget"]:checked');
        this.currentFilters.budget = Array.from(budgetCheckboxes).map(cb => cb.value);

        // Experience checkboxes
        const experienceCheckboxes = document.querySelectorAll('input[name="experience"]:checked');
        this.currentFilters.experience = Array.from(experienceCheckboxes).map(cb => cb.value);

        // Duration checkboxes
        const durationCheckboxes = document.querySelectorAll('input[name="duration"]:checked');
        this.currentFilters.duration = Array.from(durationCheckboxes).map(cb => cb.value);

        // Type checkboxes
        const typeCheckboxes = document.querySelectorAll('input[name="type"]:checked');
        this.currentFilters.type = Array.from(typeCheckboxes).map(cb => cb.value);
    }

    applyFilters() {
        console.log('=== APPLYING FILTERS ===');
        console.log('Current filters:', this.currentFilters);
        console.log('Total jobs before filtering:', this.jobs.length);
        
        if (!this.jobs || this.jobs.length === 0) {
            console.log('No jobs available to filter');
            this.filteredJobs = [];
            this.displayJobs();
            this.updateResultsInfo();
            return;
        }
        
        this.filteredJobs = this.jobs.filter(job => {
            // Search filter
            if (this.currentFilters.search && this.currentFilters.search.trim()) {
                const searchTerm = this.currentFilters.search.toLowerCase().trim();
                const matchesSearch = 
                    (job.title && job.title.toLowerCase().includes(searchTerm)) ||
                    (job.description && job.description.toLowerCase().includes(searchTerm)) ||
                    (job.skills && Array.isArray(job.skills) && job.skills.some(skill => 
                        skill && skill.toLowerCase().includes(searchTerm)
                    ));
                if (!matchesSearch) {
                    console.log(`Job "${job.title}" filtered out by search: "${searchTerm}"`);
                    return false;
                }
            }

            // Location filter
            if (this.currentFilters.location && this.currentFilters.location.trim()) {
                const locationTerm = this.currentFilters.location.toLowerCase().trim();
                if (!job.location || !job.location.toLowerCase().includes(locationTerm)) {
                    console.log(`Job "${job.title}" filtered out by location: "${locationTerm}"`);
                    return false;
                }
            }

            // Category filter
            if (this.currentFilters.category.length > 0) {
                const jobCategory = job.category || '';
                console.log(`Checking job category: "${jobCategory}" against filters: [${this.currentFilters.category.join(', ')}]`);
                if (!this.currentFilters.category.includes(jobCategory)) {
                    console.log(`Job "${job.title}" filtered out - category "${jobCategory}" not in [${this.currentFilters.category.join(', ')}]`);
                    return false;
                }
            }

            // Budget filter
            if (this.currentFilters.budget.length > 0) {
                let jobBudget = 0;
                if (job.budget && typeof job.budget === 'object') {
                    jobBudget = job.budget.type === 'fixed' ? 
                        (job.budget.max || job.budget.min || 0) : 
                        (job.budget.max || job.budget.min || 0) * 40; // Assume 40 hours for hourly
                } else if (typeof job.budget === 'number') {
                    jobBudget = job.budget;
                }
                
                const matchesBudget = this.currentFilters.budget.some(range => {
                    switch (range) {
                        case '0-500': return jobBudget <= 500;
                        case '500-1000': return jobBudget > 500 && jobBudget <= 1000;
                        case '1000-5000': return jobBudget > 1000 && jobBudget <= 5000;
                        case '5000+': return jobBudget > 5000;
                        default: return true;
                    }
                });
                if (!matchesBudget) {
                    console.log(`Job "${job.title}" filtered out by budget: $${jobBudget}`);
                    return false;
                }
            }

            // Experience filter
            if (this.currentFilters.experience.length > 0) {
                const jobExperience = job.experience || job.experienceLevel || '';
                if (!this.currentFilters.experience.includes(jobExperience)) {
                    console.log(`Job "${job.title}" filtered out by experience: "${jobExperience}"`);
                    return false;
                }
            }

            // Duration filter
            if (this.currentFilters.duration.length > 0) {
                const jobDuration = job.duration || '';
                if (!this.currentFilters.duration.includes(jobDuration)) {
                    console.log(`Job "${job.title}" filtered out by duration: "${jobDuration}"`);
                    return false;
                }
            }

            // Type filter
            if (this.currentFilters.type.length > 0) {
                const jobType = job.budget && job.budget.type ? job.budget.type : 'fixed';
                if (!this.currentFilters.type.includes(jobType)) {
                    console.log(`Job "${job.title}" filtered out by type: "${jobType}"`);
                    return false;
                }
            }

            return true;
        });

        console.log(`Jobs after filtering: ${this.filteredJobs.length} out of ${this.jobs.length}`);
        
        this.sortJobs(this.currentSort);
        this.currentPage = 1;
        this.displayJobs();
        this.updateResultsInfo();
    }

    sortJobs(sortBy) {
        this.currentSort = sortBy;
        
        if (!this.filteredJobs || this.filteredJobs.length === 0) {
            console.log('No filtered jobs to sort');
            return;
        }
        
        console.log(`Sorting ${this.filteredJobs.length} jobs by: ${sortBy}`);
        
        this.filteredJobs.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.postedDate || b.createdAt || 0) - new Date(a.postedDate || a.createdAt || 0);
                case 'budget-high':
                    const budgetA = this.getJobBudgetValue(a);
                    const budgetB = this.getJobBudgetValue(b);
                    return budgetB - budgetA;
                case 'budget-low':
                    const budgetA2 = this.getJobBudgetValue(a);
                    const budgetB2 = this.getJobBudgetValue(b);
                    return budgetA2 - budgetB2;
                case 'proposals':
                    return (a.proposals || 0) - (b.proposals || 0);
                default:
                    return 0;
            }
        });
        
        // Only call displayJobs if not being called from applyFilters
        if (arguments.length === 1) {
            this.displayJobs();
        }
    }

    getJobBudgetValue(job) {
        if (!job.budget) return 0;
        
        if (typeof job.budget === 'object') {
            const max = job.budget.max || job.budget.min || 0;
            return job.budget.type === 'fixed' ? max : max * 40; // Assume 40 hours for hourly
        }
        
        return typeof job.budget === 'number' ? job.budget : 0;
    }

    loadJobs() {
        // Only load from localStorage if no jobs are already loaded (fallback)
        if (!this.jobs || this.jobs.length === 0) {
            const storedJobs = localStorage.getItem('jobs');
            if (storedJobs) {
                this.jobs = JSON.parse(storedJobs);
                console.log('Loaded jobs from localStorage as fallback');
            }
        }
        
        console.log(`Total jobs available: ${this.jobs.length}`);
        
        // Apply current filters instead of showing all jobs
        this.applyFilters();
    }

    loadMoreJobs() {
        this.currentPage++;
        this.displayJobs();
    }

    performSearch() {
        const searchInput = document.getElementById('job-search');
        const locationInput = document.getElementById('location-search');
        
        this.currentFilters.search = searchInput.value;
        this.currentFilters.location = locationInput.value;
        
        this.applyFilters();
        
        if (searchInput.value || locationInput.value) {
            if (typeof talentSync !== 'undefined') {
                talentSync.showToast('Search completed!', 'success');
            }
        }
    }

    clearFilters() {
        console.log('Clearing all filters...');
        
        // Reset all filters
        this.currentFilters = {
            search: '',
            location: '',
            category: [],
            budget: [],
            experience: [],
            duration: [],
            type: []
        };
        
        // Clear form inputs
        const jobSearch = document.getElementById('job-search');
        const locationSearch = document.getElementById('location-search');
        
        if (jobSearch) jobSearch.value = '';
        if (locationSearch) locationSearch.value = '';
        
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
        
        const allTag = document.querySelector('.filter-tag[data-filter="all"]');
        if (allTag) allTag.classList.add('active');
        
        this.applyFilters();
        
        if (typeof talentSync !== 'undefined') {
            talentSync.showToast('Filters cleared', 'success');
        }
    }

    displayJobs() {
        const jobsList = document.getElementById('jobs-grid');
        const loadMoreBtn = document.getElementById('load-more-btn');
        
        if (!jobsList) {
            console.error('Jobs grid container not found');
            return;
        }

        const startIndex = (this.currentPage - 1) * this.jobsPerPage;
        const endIndex = startIndex + this.jobsPerPage;
        const jobsToShow = this.filteredJobs.slice(0, endIndex);

        if (jobsToShow.length === 0) {
            jobsList.innerHTML = `
                <div class="no-jobs">
                    <i class="fas fa-search"></i>
                    <h3>No jobs found</h3>
                    <p>Try adjusting your filters or search terms</p>
                    <button class="btn btn-primary" onclick="jobBrowser.clearFilters()">Clear Filters</button>
                </div>
            `;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        jobsList.innerHTML = jobsToShow.map(job => this.createJobCard(job)).join('');

        // Show/hide load more button
        if (loadMoreBtn) {
            loadMoreBtn.style.display = endIndex < this.filteredJobs.length ? 'block' : 'none';
        }
    }

    createJobCard(job) {
        // Handle different budget structures
        let budgetDisplay = '';
        let budgetType = '';
        
        if (job.budget && typeof job.budget === 'object') {
            // New structure: job.budget = { type: 'fixed', min: 100, max: 200 }
            budgetType = job.budget.type || 'fixed';
            const min = job.budget.min || 0;
            const max = job.budget.max || min;
            budgetDisplay = budgetType === 'fixed' 
                ? `$${min} - $${max}` 
                : `$${min} - $${max}/hr`;
        } else {
            // Fallback for Firebase structure
            budgetType = job.budgetType || 'fixed';
            if (budgetType === 'fixed') {
                const min = job.budgetMin || 0;
                const max = job.budgetMax || min;
                budgetDisplay = `$${min} - $${max}`;
            } else {
                const min = job.hourlyMin || job.budgetMin || 0;
                const max = job.hourlyMax || job.budgetMax || min;
                budgetDisplay = `$${min} - $${max}/hr`;
            }
        }

        const timeAgo = this.getTimeAgo(job.postedDate);
        const currentUser = typeof talentSync !== 'undefined' ? talentSync.currentUser : null;
        
        // Handle client info structure
        const clientInfo = job.client || {
            name: job.clientName || 'Client',
            avatar: job.clientAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face',
            rating: job.clientRating || 4.5
        };
        
        // Determine what action button to show based on user role
        let actionButton = '';
        if (currentUser) {
            if (currentUser.role === 'freelancer') {
                actionButton = `<button class="btn btn-primary" onclick="jobBrowser.showProposalModal('${job.id}')">Submit Proposal</button>`;
            } else if (currentUser.role === 'client') {
                actionButton = `<button class="btn btn-outline" onclick="jobBrowser.showJobDetails('${job.id}')">View Details</button>`;
            }
        } else {
            actionButton = `<button class="btn btn-primary" onclick="talentSync.showLoginModal()">Login to Apply</button>`;
        }

        return `
            <div class="job-card" data-job-id="${job.id}">
                <div class="job-header">
                    <div class="job-title-section">
                        <h3 class="job-title">${job.title}</h3>
                        <div class="job-meta">
                            <span class="job-budget">${budgetDisplay}</span>
                            <span class="job-type">${budgetType}</span>
                            <span class="job-experience">${job.experience}</span>
                        </div>
                    </div>
                    <div class="job-actions">
                        <button class="btn btn-icon" onclick="jobBrowser.toggleJobBookmark('${job.id}')" title="Bookmark">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
                
                <div class="job-description">
                    <p>${job.description}</p>
                </div>
                
                <div class="job-skills">
                    ${(job.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
                
                <div class="job-footer">
                    <div class="job-info">
                        <div class="client-info">
                            <img src="${clientInfo.avatar}" alt="${clientInfo.name}" class="client-avatar">
                            <div class="client-details">
                                <span class="client-name">${clientInfo.name}</span>
                                <div class="client-rating">
                                    <div class="stars">${this.generateStars(clientInfo.rating)}</div>
                                    <span>${clientInfo.rating}</span>
                                </div>
                            </div>
                        </div>
                        <div class="job-stats">
                            <span><i class="fas fa-paper-plane"></i> ${job.proposals || 0} proposals</span>
                            <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'}</span>
                        </div>
                    </div>
                    <div class="job-action">
                        ${actionButton}
                    </div>
                </div>
            </div>
        `;
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

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return '1 day ago';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        }
    }

    updateResultsInfo() {
        const resultsCount = document.getElementById('results-count');
        const resultsDescription = document.getElementById('results-description');
        
        if (resultsCount) {
            resultsCount.textContent = `${this.filteredJobs.length} jobs found`;
        }
        
        if (resultsDescription) {
            resultsDescription.textContent = this.filteredJobs.length > 0 
                ? 'Browse through available opportunities' 
                : 'Try adjusting your filters to see more results';
        }
    }

    showJobDetails(jobId) {
        const job = this.jobs.find(j => j.id == jobId);
        if (!job) return;

        // Handle different budget structures
        let budgetDisplay = '';
        if (job.budget && typeof job.budget === 'object') {
            budgetDisplay = job.budget.type === 'fixed' 
                ? `$${job.budget.min} - $${job.budget.max}` 
                : `$${job.budget.min} - $${job.budget.max}/hr`;
        } else {
            const budgetType = job.budgetType || 'fixed';
            if (budgetType === 'fixed') {
                budgetDisplay = `$${job.budgetMin || 0} - $${job.budgetMax || 0}`;
            } else {
                budgetDisplay = `$${job.hourlyMin || 0} - $${job.hourlyMax || 0}/hr`;
            }
        }

        // Handle client info structure
        const clientInfo = job.client || {
            name: job.clientName || 'Client',
            avatar: job.clientAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face',
            rating: job.clientRating || 4.5,
            jobsPosted: job.clientJobsPosted || 0
        };

        const modalHTML = `
            <div class="modal job-details-modal">
                <div class="modal-header">
                    <h2 class="modal-title">${job.title}</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="job-details-content">
                        <div class="job-overview">
                            <div class="job-meta-grid">
                                <div class="meta-item">
                                    <label>Budget</label>
                                    <span>${budgetDisplay}</span>
                                </div>
                                <div class="meta-item">
                                    <label>Experience Level</label>
                                    <span>${job.experience}</span>
                                </div>
                                <div class="meta-item">
                                    <label>Project Length</label>
                                    <span>${job.duration}</span>
                                </div>
                                <div class="meta-item">
                                    <label>Location</label>
                                    <span>${job.location}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="job-description-full">
                            <h3>Project Description</h3>
                            <p>${job.description}</p>
                        </div>
                        
                        <div class="job-skills-section">
                            <h3>Required Skills</h3>
                            <div class="skills-list">
                                ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                            </div>
                        </div>
                        
                        <div class="client-section">
                            <h3>About the Client</h3>
                            <div class="client-info-detailed">
                                <img src="${clientInfo.avatar}" alt="${clientInfo.name}" class="client-avatar-large">
                                <div class="client-details-full">
                                    <h4>${clientInfo.name}</h4>
                                    <div class="client-rating">
                                        <div class="stars">${this.generateStars(clientInfo.rating)}</div>
                                        <span>${clientInfo.rating} rating</span>
                                    </div>
                                    <p>${clientInfo.jobsPosted} jobs posted</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="job-stats-section">
                            <div class="stat-item">
                                <i class="fas fa-paper-plane"></i>
                                <span>${job.proposals} proposals</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-clock"></i>
                                <span>Posted ${this.getTimeAgo(job.postedDate)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="talentSync.closeModal()">Close</button>
                    ${talentSync.currentUser && talentSync.currentUser.role === 'freelancer' 
                        ? `<button class="btn btn-primary" onclick="jobBrowser.showProposalModal('${job.id}')">Submit Proposal</button>`
                        : ''
                    }
                </div>
            </div>
        `;

        if (typeof talentSync !== 'undefined') {
            talentSync.showModal(modalHTML);
        }
    }

    showProposalModal(jobId) {
        const job = this.jobs.find(j => j.id == jobId);
        if (!job) return;

        // Handle different budget structures
        let budgetDisplay = '';
        if (job.budget && typeof job.budget === 'object') {
            budgetDisplay = job.budget.type === 'fixed' 
                ? `$${job.budget.min} - $${job.budget.max}` 
                : `$${job.budget.min} - $${job.budget.max}/hr`;
        } else {
            const budgetType = job.budgetType || 'fixed';
            if (budgetType === 'fixed') {
                budgetDisplay = `$${job.budgetMin || 0} - $${job.budgetMax || 0}`;
            } else {
                budgetDisplay = `$${job.hourlyMin || 0} - $${job.hourlyMax || 0}/hr`;
            }
        }

        const modalHTML = `
            <div class="modal proposal-modal">
                <div class="modal-header">
                    <h2 class="modal-title">Submit Proposal</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="job-summary">
                        <h3>${job.title}</h3>
                        <p>Budget: ${budgetDisplay}</p>
                    </div>
                    
                    <form id="proposal-form" onsubmit="jobBrowser.submitProposal(event, '${jobId}')">
                        <div class="form-group">
                            <label class="form-label">Cover Letter</label>
                            <textarea class="form-input" name="coverLetter" rows="6" placeholder="Explain why you're the best fit for this project..." required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Your Bid Amount ($)</label>
                            <input type="number" class="form-input" name="bidAmount" min="1" placeholder="Enter your bid" required>
                            <small>Client's budget: ${budgetDisplay}</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Delivery Time</label>
                            <select class="form-input" name="deliveryTime" required>
                                <option value="">Select delivery time</option>
                                <option value="1-3 days">1-3 days</option>
                                <option value="1 week">1 week</option>
                                <option value="2 weeks">2 weeks</option>
                                <option value="1 month">1 month</option>
                                <option value="2+ months">2+ months</option>
                            </select>
                        </div>
                        
                        <div class="proposal-summary">
                            <h4>Proposal Summary</h4>
                            <div class="summary-item">
                                <span>Your bid:</span>
                                <span id="bid-display">$0</span>
                            </div>
                            <div class="summary-item">
                                <span>Service fee (10%):</span>
                                <span id="fee-display">$0</span>
                            </div>
                            <div class="summary-item total">
                                <span>You'll receive:</span>
                                <span id="total-display">$0</span>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="talentSync.closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Submit Proposal</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (typeof talentSync !== 'undefined') {
            talentSync.showModal(modalHTML);
        }
    }

    updateProposalSummary() {
        const bidInput = document.querySelector('input[name="bidAmount"]');
        const bidDisplay = document.getElementById('bid-display');
        const feeDisplay = document.getElementById('fee-display');
        const totalDisplay = document.getElementById('total-display');
        
        if (bidInput && bidDisplay && feeDisplay && totalDisplay) {
            const bid = parseFloat(bidInput.value) || 0;
            const fee = bid * 0.1;
            const total = bid - fee;
            
            bidDisplay.textContent = `$${bid.toFixed(2)}`;
            feeDisplay.textContent = `$${fee.toFixed(2)}`;
            totalDisplay.textContent = `$${total.toFixed(2)}`;
        }
    }

    async submitProposal(event, jobId) {
        event.preventDefault();
        
        if (!talentSync.currentUser) {
            talentSync.showToast('Please log in to submit a proposal', 'error');
            return;
        }
        
        const formData = new FormData(event.target);
        const bidAmount = parseFloat(formData.get('bidAmount'));
        
        if (!bidAmount || bidAmount <= 0) {
            talentSync.showToast('Please enter a valid bid amount', 'error');
            return;
        }
        
        // Find the job details
        const job = this.jobs.find(j => j.id == jobId);
        if (!job) {
            talentSync.showToast('Job not found', 'error');
            return;
        }
        
        const proposal = {
            jobId: jobId,
            jobTitle: job.title,
            freelancerId: talentSync.currentUser.id || talentSync.currentUser.uid,
            freelancerName: talentSync.currentUser.fullName,
            freelancerEmail: talentSync.currentUser.email,
            clientId: job.clientId || job.client?.id,
            clientName: job.clientName || job.client?.name,
            coverLetter: formData.get('coverLetter'),
            bidAmount: bidAmount,
            deliveryTime: formData.get('deliveryTime'),
            questions: formData.get('questions') || '',
            status: 'pending',
            submittedDate: new Date().toISOString(),
            // Additional freelancer info
            freelancerAvatar: talentSync.currentUser.profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            freelancerSkills: talentSync.currentUser.profile?.skills || [],
            freelancerRating: talentSync.currentUser.profile?.rating || 0,
            freelancerCompletedJobs: talentSync.currentUser.profile?.completedJobs || 0
        };
        
        console.log('Submitting proposal:', proposal);
        
        try {
            // Save to Firebase if available
            if (firebaseService && firebaseService.saveProposal) {
                const result = await firebaseService.saveProposal(proposal);
                if (result.success) {
                    console.log('✅ Proposal saved to Firebase:', result.id);
                    proposal.id = result.id;
                } else {
                    console.error('❌ Failed to save proposal to Firebase:', result.error);
                    throw new Error(result.error);
                }
            } else {
                // Fallback to localStorage
                proposal.id = Date.now();
                const proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
                proposals.push(proposal);
                localStorage.setItem('proposals', JSON.stringify(proposals));
                console.log('✅ Proposal saved to localStorage');
            }
            
            // Update job proposal count
            await this.updateJobProposalCount(jobId);
            
            if (typeof talentSync !== 'undefined') {
                talentSync.closeModal();
                talentSync.showToast('Proposal submitted successfully!', 'success');
            }
            
            console.log('Proposal submitted successfully:', proposal);
        } catch (error) {
            console.error('Error submitting proposal:', error);
            if (typeof talentSync !== 'undefined') {
                talentSync.showToast('Failed to submit proposal. Please try again.', 'error');
            }
        }
    }

    async updateJobProposalCount(jobId) {
        try {
            if (firebaseService && firebaseService.db) {
                // Get current job data
                const jobDoc = await firebaseService.db.collection('jobs').doc(jobId).get();
                if (jobDoc.exists) {
                    const currentProposals = jobDoc.data().proposals || 0;
                    await firebaseService.db.collection('jobs').doc(jobId).update({
                        proposals: currentProposals + 1,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('✅ Updated job proposal count');
                }
            } else {
                // Update localStorage
                const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
                const jobIndex = jobs.findIndex(j => j.id == jobId);
                if (jobIndex !== -1) {
                    jobs[jobIndex].proposals = (jobs[jobIndex].proposals || 0) + 1;
                    localStorage.setItem('jobs', JSON.stringify(jobs));
                }
            }
        } catch (error) {
            console.error('Error updating job proposal count:', error);
        }
    }

    toggleJobBookmark(jobId) {
        // Toggle bookmark functionality
        const bookmarks = JSON.parse(localStorage.getItem('bookmarkedJobs') || '[]');
        const index = bookmarks.indexOf(jobId);
        
        if (index > -1) {
            bookmarks.splice(index, 1);
            if (typeof talentSync !== 'undefined') {
                talentSync.showToast('Job removed from bookmarks', 'info');
            }
        } else {
            bookmarks.push(jobId);
            if (typeof talentSync !== 'undefined') {
                talentSync.showToast('Job bookmarked!', 'success');
            }
        }
        
        localStorage.setItem('bookmarkedJobs', JSON.stringify(bookmarks));
        
        // Update bookmark icon
        const bookmarkBtn = document.querySelector(`[onclick="jobBrowser.toggleJobBookmark('${jobId}')"] i`);
        if (bookmarkBtn) {
            bookmarkBtn.className = bookmarks.includes(jobId) ? 'fas fa-heart' : 'far fa-heart';
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Category filtering from external calls (e.g., from index page)
    filterByCategory(category) {
        console.log('Filtering by category from external call:', category);
        
        // Update filter tags
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
            if (tag.dataset.filter === category) {
                tag.classList.add('active');
            }
        });
        
        this.currentFilters.category = [category];
        this.applyFilters();
        
        console.log('Filtered jobs:', this.filteredJobs.length);
    }

    navigateToHome() {
        window.location.href = 'index.html';
    }
}

// Initialize job browser when page loads
const jobBrowser = new JobBrowser();

// Make it globally available
window.jobBrowser = jobBrowser;
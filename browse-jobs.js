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
        if (typeof talentSync !== 'undefined' && typeof firebaseService !== 'undefined') {
            console.log('JobBrowser: TalentSync and Firebase available, initializing...');
            // Initialize navigation first
            this.setupNavigation();
            
            // Wait a bit more for Firebase to be fully ready
            setTimeout(() => {
                this.loadJobsData();
            }, 500);
            
            this.populateCategories();
            this.setupEventListeners();
            
            // Listen for user loaded event to re-render with correct buttons
            window.addEventListener('userLoaded', () => {
                console.log('User loaded, re-rendering jobs with correct role buttons');
                this.displayJobs();
            });
        } else {
            console.log('JobBrowser: Waiting for TalentSync and Firebase...');
            // Retry after a short delay
            setTimeout(() => this.init(), 200);
        }
    }

    async loadJobsData() {
        console.log('Loading jobs data...');
        
        if (talentSync.useFirebase && firebaseService && firebaseService.db) {
            try {
                console.log('Loading jobs from Firebase...');
                // Load from Firebase
                const result = await firebaseService.loadJobs();
                console.log('Firebase jobs result:', result);
                
                if (result.success && result.data) {
                    this.jobs = result.data;
                    console.log(`Loaded ${this.jobs.length} jobs from Firebase`);
                    
                    // Set up real-time listener for job updates
                    this.setupRealtimeJobListener();
                } else {
                    console.error('Failed to load jobs from Firebase:', result.error);
                    this.generateDemoJobs();
                }
            } catch (error) {
                console.error('Error loading jobs from Firebase:', error);
                this.generateDemoJobs();
            }
        } else {
            console.log('Firebase not available, using demo data');
            // Fallback to demo data
            this.generateDemoJobs();
        }
        
        // Load jobs and then handle incoming search/category filters
        this.loadJobs();
        
        // Handle incoming search/category after jobs are loaded
        this.handleIncomingSearch();
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
        
        // Setup mobile navigation
        this.setupMobileNavigation();
    }

    setupMobileNavigation() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
                
                // Prevent body scroll when menu is open
                if (navMenu.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = 'auto';
                }
            });
            
            // Close menu when clicking on a link
            navMenu.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                    document.body.style.overflow = 'auto';
                });
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                    document.body.style.overflow = 'auto';
                }
            });
        }
    }

    updateNavigation() {
        // Load theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.querySelector('.theme-toggle i');
        if (themeToggle) {
            themeToggle.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    generateDemoJobs() {
        const categories = [
            'web-development', 'mobile-development', 'design', 'writing', 
            'marketing', 'data-science', 'video-editing', 'translation'
        ];
        
        const skills = {
            'web-development': ['JavaScript', 'React', 'Node.js', 'Python', 'PHP', 'Vue.js'],
            'mobile-development': ['React Native', 'Flutter', 'iOS', 'Android', 'Kotlin', 'Swift'],
            'design': ['Photoshop', 'Figma', 'Illustrator', 'UI/UX', 'Branding', 'Logo Design'],
            'writing': ['Content Writing', 'Copywriting', 'Technical Writing', 'SEO Writing'],
            'marketing': ['SEO', 'Google Ads', 'Social Media', 'Email Marketing', 'Analytics'],
            'data-science': ['Python', 'Machine Learning', 'SQL', 'Tableau', 'R', 'TensorFlow'],
            'video-editing': ['After Effects', 'Premiere Pro', 'Final Cut Pro', 'Motion Graphics'],
            'translation': ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic']
        };

        const jobTitles = {
            'web-development': [
                'Full Stack Developer for E-commerce Platform',
                'React Developer for SaaS Dashboard',
                'WordPress Developer for Business Website',
                'Node.js Backend Developer',
                'Frontend Developer for Mobile App',
                'Python Developer for Data Platform'
            ],
            'mobile-development': [
                'iOS App Developer for Fitness App',
                'Android Developer for Food Delivery',
                'React Native Developer for Social App',
                'Flutter Developer for E-commerce',
                'Mobile App UI/UX Designer',
                'Cross-platform App Developer'
            ],
            'design': [
                'Logo Designer for Tech Startup',
                'UI/UX Designer for Mobile App',
                'Brand Identity Designer',
                'Website Designer for Restaurant',
                'Graphic Designer for Marketing Materials',
                'Illustration Designer for Children\'s Book'
            ],
            'writing': [
                'Content Writer for Tech Blog',
                'Copywriter for Marketing Campaign',
                'Technical Writer for Software Documentation',
                'SEO Content Writer',
                'Social Media Content Creator',
                'Product Description Writer'
            ],
            'marketing': [
                'Digital Marketing Specialist',
                'SEO Expert for E-commerce Site',
                'Google Ads Campaign Manager',
                'Social Media Marketing Manager',
                'Email Marketing Specialist',
                'Content Marketing Strategist'
            ],
            'data-science': [
                'Data Analyst for Sales Dashboard',
                'Machine Learning Engineer',
                'Data Scientist for Predictive Analytics',
                'Business Intelligence Developer',
                'Data Visualization Specialist',
                'AI/ML Consultant'
            ]
        };

        const clients = [
            { name: 'TechStart Inc.', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face', rating: 4.8, jobsPosted: 15 },
            { name: 'Creative Agency', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face', rating: 4.9, jobsPosted: 23 },
            { name: 'StartupXYZ', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face', rating: 4.7, jobsPosted: 8 },
            { name: 'Digital Solutions', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face', rating: 4.6, jobsPosted: 31 },
            { name: 'Innovation Labs', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face', rating: 4.9, jobsPosted: 12 }
        ];

        this.jobs = [];
        
        for (let i = 0; i < 50; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const client = clients[Math.floor(Math.random() * clients.length)];
            const categorySkills = skills[category] || [];
            const categoryTitles = jobTitles[category] || ['Generic Project'];
            
            const job = {
                id: i + 1,
                title: categoryTitles[Math.floor(Math.random() * categoryTitles.length)],
                description: this.generateJobDescription(category),
                category: category,
                budget: {
                    type: Math.random() > 0.5 ? 'fixed' : 'hourly',
                    min: Math.floor(Math.random() * 2000) + 500,
                    max: Math.floor(Math.random() * 5000) + 2000
                },
                skills: this.getRandomSkills(categorySkills, 3, 6),
                experience: ['entry', 'intermediate', 'expert'][Math.floor(Math.random() * 3)],
                duration: ['short', 'medium', 'long'][Math.floor(Math.random() * 3)],
                client: client,
                proposals: Math.floor(Math.random() * 25) + 1,
                postedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                location: Math.random() > 0.7 ? 'Remote' : ['New York', 'London', 'San Francisco', 'Toronto', 'Berlin'][Math.floor(Math.random() * 5)],
                urgent: Math.random() > 0.8
            };
            
            this.jobs.push(job);
        }
        
        // Store jobs in localStorage
        localStorage.setItem('jobs', JSON.stringify(this.jobs));
    }

    generateJobDescription(category) {
        const descriptions = {
            'web-development': [
                'We are looking for an experienced web developer to build a modern, responsive website for our growing business. The project involves creating a user-friendly interface with clean design and robust functionality.',
                'Seeking a skilled full-stack developer to create a comprehensive web application with user authentication, database integration, and API development.',
                'Need a WordPress expert to customize our existing theme and add new functionality including e-commerce capabilities and payment integration.'
            ],
            'mobile-development': [
                'Looking for a mobile app developer to create a cross-platform application for iOS and Android. The app should have a modern UI and integrate with our existing backend systems.',
                'We need an experienced iOS developer to build a native app with advanced features including push notifications, in-app purchases, and social media integration.',
                'Seeking a React Native developer to create a mobile app for our food delivery service with real-time tracking and payment processing.'
            ],
            'design': [
                'We need a creative designer to develop a complete brand identity including logo, color palette, typography, and brand guidelines for our new startup.',
                'Looking for a UI/UX designer to redesign our mobile app interface with focus on user experience and modern design principles.',
                'Seeking a graphic designer to create marketing materials including brochures, social media graphics, and website banners.'
            ],
            'writing': [
                'We are looking for a skilled content writer to create engaging blog posts and articles for our technology website. Experience in SEO writing is preferred.',
                'Need a copywriter to develop compelling marketing copy for our new product launch including website content, email campaigns, and social media posts.',
                'Seeking a technical writer to create comprehensive documentation for our software product including user guides and API documentation.'
            ],
            'marketing': [
                'Looking for a digital marketing expert to develop and execute a comprehensive marketing strategy including SEO, social media, and paid advertising.',
                'We need an SEO specialist to optimize our website for search engines and improve our organic traffic and rankings.',
                'Seeking a social media manager to create and manage content across multiple platforms and engage with our audience.'
            ]
        };
        
        const categoryDescriptions = descriptions[category] || descriptions['web-development'];
        return categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
    }

    getRandomSkills(skillsArray, min, max) {
        const count = Math.floor(Math.random() * (max - min + 1)) + min;
        const shuffled = [...skillsArray].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
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
        categoryFilters.innerHTML = categories.map(category => `
            <label class="filter-option">
                <input type="checkbox" name="category" value="${category.value}">
                <span>${category.label}</span>
            </label>
        `).join('');
    }

    setupEventListeners() {
        // Search functionality
        const jobSearch = document.getElementById('job-search');
        const locationSearch = document.getElementById('location-search');
        
        if (jobSearch) {
            jobSearch.addEventListener('input', this.debounce(() => {
                this.currentFilters.search = jobSearch.value;
                this.applyFilters();
            }, 300));
        }
        
        if (locationSearch) {
            locationSearch.addEventListener('input', this.debounce(() => {
                this.currentFilters.location = locationSearch.value;
                this.applyFilters();
            }, 300));
        }

        // Quick filters
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                const filter = e.target.dataset.filter;
                if (filter === 'all') {
                    this.currentFilters.category = [];
                } else {
                    this.currentFilters.category = [filter];
                }
                this.applyFilters();
            });
        });

        // Sidebar filters
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateFiltersFromCheckboxes();
                this.applyFilters();
            });
        });

        // Proposal form bid calculation
        const bidInput = document.querySelector('input[name="bidAmount"]');
        if (bidInput) {
            bidInput.addEventListener('input', () => {
                this.updateProposalSummary();
            });
        }
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
            console.log('Applying category filter:', selectedCategory);
            this.currentFilters.category = [selectedCategory];
            
            // Update active filter tag
            document.querySelectorAll('.filter-tag').forEach(tag => {
                tag.classList.remove('active');
                if (tag.dataset.filter === selectedCategory) {
                    tag.classList.add('active');
                    console.log('Activated filter tag:', tag.textContent);
                }
            });
            sessionStorage.removeItem('selectedCategory');
            this.applyFilters();
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

    updateFiltersFromCheckboxes() {
        // Update category filters
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
        this.currentFilters.category = Array.from(categoryCheckboxes).map(cb => cb.value);

        // Update budget filters
        const budgetCheckboxes = document.querySelectorAll('input[name="budget"]:checked');
        this.currentFilters.budget = Array.from(budgetCheckboxes).map(cb => cb.value);

        // Update experience filters
        const experienceCheckboxes = document.querySelectorAll('input[name="experience"]:checked');
        this.currentFilters.experience = Array.from(experienceCheckboxes).map(cb => cb.value);

        // Update duration filters
        const durationCheckboxes = document.querySelectorAll('input[name="duration"]:checked');
        this.currentFilters.duration = Array.from(durationCheckboxes).map(cb => cb.value);

        // Update type filters
        const typeCheckboxes = document.querySelectorAll('input[name="type"]:checked');
        this.currentFilters.type = Array.from(typeCheckboxes).map(cb => cb.value);
    }

    applyFilters() {
        console.log('Applying filters:', this.currentFilters);
        console.log('Total jobs before filtering:', this.jobs.length);
        
        this.filteredJobs = this.jobs.filter(job => {
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const matchesSearch = 
                    job.title.toLowerCase().includes(searchTerm) ||
                    job.description.toLowerCase().includes(searchTerm) ||
                    job.skills.some(skill => skill.toLowerCase().includes(searchTerm));
                if (!matchesSearch) return false;
            }

            // Location filter
            if (this.currentFilters.location) {
                const locationTerm = this.currentFilters.location.toLowerCase();
                if (!job.location.toLowerCase().includes(locationTerm)) return false;
            }

            // Category filter
            if (this.currentFilters.category.length > 0) {
                console.log(`Checking job category: ${job.category} against filters: ${this.currentFilters.category}`);
                if (!this.currentFilters.category.includes(job.category)) {
                    console.log(`Job ${job.title} filtered out - category ${job.category} not in ${this.currentFilters.category}`);
                    return false;
                }
            }

            // Budget filter
            if (this.currentFilters.budget.length > 0) {
                const jobBudget = job.budget.type === 'fixed' ? job.budget.max : job.budget.max * 40; // Assume 40 hours for hourly
                const matchesBudget = this.currentFilters.budget.some(range => {
                    switch (range) {
                        case '0-500': return jobBudget <= 500;
                        case '500-1000': return jobBudget > 500 && jobBudget <= 1000;
                        case '1000-5000': return jobBudget > 1000 && jobBudget <= 5000;
                        case '5000+': return jobBudget > 5000;
                        default: return true;
                    }
                });
                if (!matchesBudget) return false;
            }

            // Experience filter
            if (this.currentFilters.experience.length > 0) {
                if (!this.currentFilters.experience.includes(job.experience)) return false;
            }

            // Duration filter
            if (this.currentFilters.duration.length > 0) {
                if (!this.currentFilters.duration.includes(job.duration)) return false;
            }

            // Type filter
            if (this.currentFilters.type.length > 0) {
                if (!this.currentFilters.type.includes(job.budget.type)) return false;
            }

            return true;
        });

        console.log('Jobs after filtering:', this.filteredJobs.length);
        
        this.sortJobs(this.currentSort);
        this.currentPage = 1;
        this.displayJobs();
        this.updateResultsInfo();
    }

    sortJobs(sortBy) {
        this.currentSort = sortBy;
        
        this.filteredJobs.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.postedDate) - new Date(a.postedDate);
                case 'budget-high':
                    const budgetA = a.budget.type === 'fixed' ? a.budget.max : a.budget.max * 40;
                    const budgetB = b.budget.type === 'fixed' ? b.budget.max : b.budget.max * 40;
                    return budgetB - budgetA;
                case 'budget-low':
                    const budgetA2 = a.budget.type === 'fixed' ? a.budget.min : a.budget.min * 40;
                    const budgetB2 = b.budget.type === 'fixed' ? b.budget.min : b.budget.min * 40;
                    return budgetA2 - budgetB2;
                case 'proposals':
                    return a.proposals - b.proposals;
                default:
                    return 0;
            }
        });
        
        this.displayJobs();
    }

    displayJobs() {
        const jobsGrid = document.getElementById('jobs-grid');
        const startIndex = (this.currentPage - 1) * this.jobsPerPage;
        const endIndex = startIndex + this.jobsPerPage;
        const jobsToShow = this.filteredJobs.slice(0, endIndex);

        jobsGrid.innerHTML = jobsToShow.map(job => this.createJobCard(job)).join('');

        // Update load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (endIndex >= this.filteredJobs.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
    }

    createJobCard(job) {
        const budgetDisplay = job.budget.type === 'fixed' 
            ? `$${job.budget.min} - $${job.budget.max}` 
            : `$${job.budget.min} - $${job.budget.max}/hr`;

        const timeAgo = this.getTimeAgo(job.postedDate);
        
        return `
            <div class="job-card" onclick="jobBrowser.showJobDetails(${job.id})">
                <div class="job-card-header">
                    <div>
                        <h3 class="job-card-title">${job.title}</h3>
                        <div class="job-card-meta">
                            <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                            <span><i class="fas fa-paper-plane"></i> ${job.proposals} proposals</span>
                            ${job.urgent ? '<span class="badge badge-warning"><i class="fas fa-bolt"></i> Urgent</span>' : ''}
                        </div>
                    </div>
                    <div>
                        <div class="job-card-budget">${budgetDisplay}</div>
                        <div class="job-card-type">${job.budget.type === 'fixed' ? 'Fixed Price' : 'Hourly'}</div>
                    </div>
                </div>
                
                <div class="job-card-description">
                    ${job.description}
                </div>
                
                <div class="job-card-skills">
                    ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
                
                <div class="job-card-footer">
                    <div class="job-card-client">
                        <div class="client-avatar">
                            <img src="${job.client.avatar}" alt="${job.client.name}">
                        </div>
                        <div class="client-info">
                            <h4>${job.client.name}</h4>
                            <p>${job.client.jobsPosted} jobs posted</p>
                            <div class="client-rating">
                                ${this.generateStars(job.client.rating)}
                                <span>${job.client.rating}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="job-card-actions">
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); jobBrowser.saveJob(${job.id})">
                            <i class="fas fa-heart"></i> Save
                        </button>
                        ${talentSync.currentUser && talentSync.currentUser.role === 'freelancer' ? 
                            `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); jobBrowser.showProposalModal(${job.id})">
                                Apply Now
                            </button>` : 
                            `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); jobBrowser.showJobDetails(${job.id})">
                                View Details
                            </button>`
                        }
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
        
        return stars;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffTime = Math.abs(now - new Date(date));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    }

    updateResultsInfo() {
        const resultsCount = document.getElementById('results-count');
        const resultsDescription = document.getElementById('results-description');
        
        resultsCount.textContent = `${this.filteredJobs.length} jobs found`;
        resultsDescription.textContent = this.filteredJobs.length > 0 
            ? 'Browse through available opportunities' 
            : 'Try adjusting your filters to see more results';
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
        this.filteredJobs = [...this.jobs];
        this.sortJobs('newest');
        this.displayJobs();
        this.updateResultsInfo();
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
            talentSync.showToast('Search completed!', 'success');
        }
    }

    clearFilters() {
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
        document.getElementById('job-search').value = '';
        document.getElementById('location-search').value = '';
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
        document.querySelector('.filter-tag[data-filter="all"]').classList.add('active');
        
        this.applyFilters();
        talentSync.showToast('Filters cleared', 'success');
    }

    showJobDetails(jobId) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;

        const budgetDisplay = job.budget.type === 'fixed' 
            ? `$${job.budget.min} - $${job.budget.max}` 
            : `$${job.budget.min} - $${job.budget.max}/hr`;

        const modalContent = `
            <div class="job-detail-header">
                <h2 class="job-detail-title">${job.title}</h2>
                <div class="job-detail-meta">
                    <span><i class="fas fa-clock"></i> Posted ${this.getTimeAgo(job.postedDate)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                    <span><i class="fas fa-paper-plane"></i> ${job.proposals} proposals</span>
                </div>
                <div class="job-detail-budget">${budgetDisplay}</div>
            </div>
            
            <div class="job-detail-description">
                <h3>Project Description</h3>
                <p>${job.description}</p>
            </div>
            
            <div class="job-detail-skills">
                <h3>Required Skills</h3>
                <div class="job-card-skills">
                    ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
            
            <div class="job-detail-client">
                <h3>About the Client</h3>
                <div class="client-profile">
                    <div class="client-avatar">
                        <img src="${job.client.avatar}" alt="${job.client.name}">
                    </div>
                    <div class="client-info">
                        <h4>${job.client.name}</h4>
                        <div class="client-rating">
                            ${this.generateStars(job.client.rating)}
                            <span>${job.client.rating} rating</span>
                        </div>
                    </div>
                </div>
                <div class="client-stats">
                    <div class="client-stat">
                        <div class="value">${job.client.jobsPosted}</div>
                        <div class="label">Jobs Posted</div>
                    </div>
                    <div class="client-stat">
                        <div class="value">$${Math.floor(Math.random() * 50000) + 10000}</div>
                        <div class="label">Total Spent</div>
                    </div>
                    <div class="client-stat">
                        <div class="value">${Math.floor(Math.random() * 20) + 5}</div>
                        <div class="label">Hires</div>
                    </div>
                </div>
            </div>
            
            ${this.currentUser && this.currentUser.role === 'freelancer' ? `
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn btn-primary" onclick="jobBrowser.showProposalModal(${job.id})">
                        <i class="fas fa-paper-plane"></i> Submit Proposal
                    </button>
                </div>
            ` : ''}
        `;

        document.getElementById('job-modal-content').innerHTML = modalContent;
        document.getElementById('job-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeJobModal() {
        document.getElementById('job-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    showProposalModal(jobId) {
        if (!talentSync.currentUser || talentSync.currentUser.role !== 'freelancer') {
            talentSync.showToast('Please login as a freelancer to apply for jobs', 'error');
            return;
        }

        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;

        // Store current job ID for proposal submission
        this.currentJobId = jobId;
        
        document.getElementById('proposal-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('proposal-form').reset();
        this.updateProposalSummary();
    }

    closeProposalModal() {
        document.getElementById('proposal-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        this.currentJobId = null;
    }

    updateProposalSummary() {
        const bidInput = document.querySelector('input[name="bidAmount"]');
        const bidAmount = parseFloat(bidInput.value) || 0;
        const fee = bidAmount * 0.1; // 10% platform fee
        const receive = bidAmount - fee;

        document.getElementById('bid-summary').textContent = `$${bidAmount.toFixed(2)}`;
        document.getElementById('fee-summary').textContent = `$${fee.toFixed(2)}`;
        document.getElementById('receive-summary').textContent = `$${receive.toFixed(2)}`;
    }

    submitProposal(event) {
        event.preventDefault();
        
        if (!talentSync.currentUser || !this.currentJobId) {
            talentSync.showToast('Please login to submit proposals', 'error');
            return;
        }

        if (talentSync.currentUser.role !== 'freelancer') {
            talentSync.showToast('Only freelancers can submit proposals', 'error');
            return;
        }

        const formData = new FormData(event.target);
        const job = this.jobs.find(j => j.id === this.currentJobId);
        
        const proposal = {
            id: Date.now(),
            jobId: this.currentJobId,
            freelancerId: talentSync.currentUser.id,
            freelancerName: talentSync.currentUser.fullName,
            freelancerAvatar: talentSync.currentUser.profile.avatar,
            coverLetter: formData.get('coverLetter'),
            bidAmount: parseFloat(formData.get('bidAmount')),
            deliveryTime: formData.get('deliveryTime'),
            questions: formData.get('questions'),
            status: 'pending',
            submittedDate: new Date().toISOString()
        };

        // Store proposal
        const proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
        proposals.push(proposal);
        localStorage.setItem('proposals', JSON.stringify(proposals));

        // Update job proposals count
        if (job) {
            job.proposals++;
            localStorage.setItem('jobs', JSON.stringify(this.jobs));
        }

        // Send message to client
        const messageText = `Hi! I'd like to apply for your job: ${job.title}\n\nMy Proposal:\n${proposal.coverLetter}\n\nBid Amount: $${proposal.bidAmount}\nDelivery Time: ${proposal.deliveryTime}\n\n${proposal.questions ? 'Questions: ' + proposal.questions : ''}`;
        
        const message = {
            conversationId: `${talentSync.currentUser.id}_${job.client.id}`,
            senderId: talentSync.currentUser.id,
            senderName: talentSync.currentUser.fullName,
            senderAvatar: talentSync.currentUser.profile.avatar,
            receiverId: job.client.id,
            receiverName: job.client.name,
            receiverAvatar: job.client.avatar,
            message: messageText,
            timestamp: new Date().toISOString(),
            read: false
        };

        // Store message in Firestore
        if (firebaseService && firebaseService.db) {
            console.log('Sending proposal message to Firestore for client:', job.client.id);
            firebaseService.saveMessage(message).then(result => {
                if (result.success) {
                    console.log('Message sent successfully to Firestore');
                } else {
                    console.error('Failed to send message:', result.error);
                }
            }).catch(error => {
                console.error('Error sending message:', error);
            });
        } else {
            console.warn('Firebase not available, message not sent');
        }

        this.closeProposalModal();
        talentSync.showToast('Proposal submitted successfully!', 'success');
        
        // Refresh the jobs display
        this.displayJobs();
    }

    saveJob(jobId) {
        if (!talentSync.currentUser) {
            talentSync.showToast('Please login to save jobs', 'error');
            return;
        }

        const savedJobs = JSON.parse(localStorage.getItem(`savedJobs_${talentSync.currentUser.id}`) || '[]');
        
        if (!savedJobs.includes(jobId)) {
            savedJobs.push(jobId);
            localStorage.setItem(`savedJobs_${talentSync.currentUser.id}`, JSON.stringify(savedJobs));
            talentSync.showToast('Job saved to your favorites!', 'success');
        } else {
            talentSync.showToast('Job already in your favorites', 'info');
        }
    }

    // Debug function to test category filtering
    testCategoryFilter(category) {
        console.log('=== TESTING CATEGORY FILTER ===');
        console.log('Available jobs:', this.jobs.length);
        console.log('Job categories:', [...new Set(this.jobs.map(j => j.category))]);
        console.log('Testing filter for category:', category);
        
        this.currentFilters.category = [category];
        this.applyFilters();
        
        console.log('Filtered jobs:', this.filteredJobs.length);
        console.log('Filtered job titles:', this.filteredJobs.map(j => j.title));
    }

    logout() {
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Initialize job browser when page loads
const jobBrowser = new JobBrowser();

// Make it globally available
window.jobBrowser = jobBrowser;
// Freelancers Browser JavaScript with Firebase Integration
class FreelancerBrowser {
    constructor() {
        this.freelancers = [];
        this.filteredFreelancers = [];
        this.currentPage = 1;
        this.freelancersPerPage = 12;
        this.currentFilters = {
            search: '',
            category: '',
            rate: [],
            experience: [],
            rating: [],
            availability: [],
            location: []
        };
        this.currentSort = 'rating';
        
        this.init();
    }

    init() {
        // Wait for talentSync to be initialized and Firebase to be ready
        if (typeof talentSync !== 'undefined' && typeof firebaseService !== 'undefined') {
            console.log('FreelancerBrowser: TalentSync and Firebase available, initializing...');
            // Initialize navigation first
            this.setupNavigation();
            
            // Wait a bit more for Firebase to be fully ready
            setTimeout(() => {
                this.loadFreelancersData();
            }, 500);
            
            this.setupEventListeners();
            
            // Listen for user loaded event to re-render with correct buttons
            window.addEventListener('userLoaded', () => {
                console.log('User loaded, re-rendering freelancers with correct role buttons');
                this.displayFreelancers();
            });
        } else {
            console.log('FreelancerBrowser: Waiting for TalentSync and Firebase...');
            // Retry after a short delay
            setTimeout(() => this.init(), 200);
        }
    }

    async loadFreelancersData() {
        console.log('Loading freelancers data...');
        
        if (talentSync.useFirebase && firebaseService && firebaseService.db) {
            try {
                console.log('Loading freelancers from Firebase...');
                // Load from Firebase
                const result = await firebaseService.loadFreelancers();
                console.log('Firebase freelancers result:', result);
                
                if (result.success && result.data) {
                    this.freelancers = result.data;
                    console.log(`Loaded ${this.freelancers.length} freelancers from Firebase`);
                } else {
                    console.error('Failed to load freelancers from Firebase:', result.error);
                    this.generateDemoFreelancers();
                }
            } catch (error) {
                console.error('Error loading freelancers from Firebase:', error);
                this.generateDemoFreelancers();
            }
        } else {
            console.log('Firebase not available, using demo data');
            // Fallback to demo data
            this.generateDemoFreelancers();
        }
        
        this.loadFreelancers();
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
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        if (talentSync.currentUser) {
            navActions.innerHTML = `
                <button class="theme-toggle" onclick="talentSync.toggleTheme()">
                    <i class="fas fa-moon"></i>
                </button>
                <div class="language-selector">
                    <select onchange="talentSync.changeLanguage(this.value)">
                        <option value="en">EN</option>
                        <option value="es">ES</option>
                        <option value="fr">FR</option>
                    </select>
                </div>
                <button class="btn btn-outline" onclick="talentSync.showNotifications()">
                    <i class="fas fa-bell"></i>
                    <span class="notification-count">3</span>
                </button>
                <div class="user-menu">
                    <div class="user-avatar" onclick="talentSync.toggleUserMenu()">
                        <img src="${talentSync.currentUser.profile.avatar}" alt="${talentSync.currentUser.fullName}">
                        <div class="online-indicator"></div>
                    </div>
                    <div class="user-dropdown" id="user-dropdown">
                        <div class="dropdown-header">
                            <img src="${talentSync.currentUser.profile.avatar}" alt="${talentSync.currentUser.fullName}">
                            <div class="user-info">
                                <h4>${talentSync.currentUser.fullName}</h4>
                                <p>${talentSync.currentUser.role}</p>
                            </div>
                        </div>
                        <div class="dropdown-menu">
                            <a href="dashboard.html" class="dropdown-item">
                                <i class="fas fa-tachometer-alt"></i>
                                Dashboard
                            </a>
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
                            <a href="#" onclick="talentSync.logout()" class="dropdown-item">
                                <i class="fas fa-sign-out-alt"></i>
                                Logout
                            </a>
                        </div>
                    </div>
                </div>
            `;
        } else {
            navActions.innerHTML = `
                <button class="theme-toggle" onclick="talentSync.toggleTheme()">
                    <i class="fas fa-moon"></i>
                </button>
                <div class="language-selector">
                    <select onchange="talentSync.changeLanguage(this.value)">
                        <option value="en">EN</option>
                        <option value="es">ES</option>
                        <option value="fr">FR</option>
                    </select>
                </div>
                <button class="btn btn-outline" onclick="talentSync.showLoginModal()">Log In</button>
                <button class="btn btn-primary" onclick="talentSync.showSignupModal()">Sign Up</button>
            `;
        }
    }

    generateDemoFreelancers() {
        const categories = [
            'web-development', 'mobile-development', 'design', 'writing', 
            'marketing', 'data-science', 'video-editing', 'translation'
        ];
        
        const skills = {
            'web-development': ['JavaScript', 'React', 'Node.js', 'Python', 'PHP', 'Vue.js', 'Angular', 'TypeScript'],
            'mobile-development': ['React Native', 'Flutter', 'iOS', 'Android', 'Kotlin', 'Swift', 'Xamarin'],
            'design': ['Photoshop', 'Figma', 'Illustrator', 'UI/UX', 'Branding', 'Logo Design', 'After Effects'],
            'writing': ['Content Writing', 'Copywriting', 'Technical Writing', 'SEO Writing', 'Blogging'],
            'marketing': ['SEO', 'Google Ads', 'Social Media', 'Email Marketing', 'Analytics', 'PPC'],
            'data-science': ['Python', 'Machine Learning', 'SQL', 'Tableau', 'R', 'TensorFlow', 'Data Analysis'],
            'video-editing': ['After Effects', 'Premiere Pro', 'Final Cut Pro', 'Motion Graphics', 'Animation'],
            'translation': ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Portuguese']
        };

        const names = [
            'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim', 'Lisa Thompson',
            'Alex Martinez', 'Jessica Wang', 'Ryan O\'Connor', 'Maria Garcia', 'James Wilson',
            'Anna Kowalski', 'Mohammed Ali', 'Sophie Dubois', 'Carlos Silva', 'Priya Patel',
            'John Smith', 'Elena Rossi', 'Ahmed Hassan', 'Yuki Tanaka', 'Isabella Brown',
            'Lucas Mueller', 'Fatima Al-Zahra', 'Viktor Petrov', 'Camila Santos', 'Raj Kumar'
        ];

        const titles = {
            'web-development': ['Full Stack Developer', 'Frontend Developer', 'Backend Developer', 'React Developer', 'Node.js Developer'],
            'mobile-development': ['Mobile App Developer', 'iOS Developer', 'Android Developer', 'React Native Developer', 'Flutter Developer'],
            'design': ['UI/UX Designer', 'Graphic Designer', 'Brand Designer', 'Web Designer', 'Product Designer'],
            'writing': ['Content Writer', 'Copywriter', 'Technical Writer', 'SEO Writer', 'Blog Writer'],
            'marketing': ['Digital Marketer', 'SEO Specialist', 'Social Media Manager', 'PPC Expert', 'Marketing Strategist'],
            'data-science': ['Data Scientist', 'Data Analyst', 'ML Engineer', 'Business Analyst', 'Data Visualization Expert']
        };

        const locations = [
            'Remote', 'New York, USA', 'London, UK', 'Toronto, Canada', 'Berlin, Germany',
            'San Francisco, USA', 'Paris, France', 'Sydney, Australia', 'Tokyo, Japan',
            'Barcelona, Spain', 'Amsterdam, Netherlands', 'Singapore', 'Mumbai, India'
        ];

        const bios = [
            'Passionate developer with expertise in modern web technologies. I love creating scalable applications that solve real-world problems.',
            'Creative designer focused on user experience and visual storytelling. I bring ideas to life through thoughtful design.',
            'Results-driven marketer with a track record of growing businesses through digital strategies and data-driven campaigns.',
            'Experienced writer who crafts compelling content that engages audiences and drives conversions.',
            'Data enthusiast who transforms complex datasets into actionable insights for business growth.',
            'Mobile app specialist dedicated to creating seamless user experiences across all platforms.',
            'Brand strategist helping businesses establish their unique identity in competitive markets.',
            'Technical expert with a passion for clean code and innovative solutions.'
        ];

        this.freelancers = [];
        
        for (let i = 0; i < 50; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const categorySkills = skills[category] || [];
            const categoryTitles = titles[category] || ['Specialist'];
            
            const freelancer = {
                id: i + 1,
                name: names[Math.floor(Math.random() * names.length)],
                title: categoryTitles[Math.floor(Math.random() * categoryTitles.length)],
                category: category,
                avatar: `https://images.unsplash.com/photo-${this.getRandomAvatar()}?w=150&h=150&fit=crop&crop=face`,
                location: locations[Math.floor(Math.random() * locations.length)],
                hourlyRate: Math.floor(Math.random() * 150) + 25,
                rating: (Math.random() * 1.5 + 3.5).toFixed(1),
                reviewCount: Math.floor(Math.random() * 200) + 10,
                completedJobs: Math.floor(Math.random() * 150) + 5,
                skills: this.getRandomSkills(categorySkills, 4, 8),
                bio: bios[Math.floor(Math.random() * bios.length)],
                experience: ['entry', 'intermediate', 'expert'][Math.floor(Math.random() * 3)],
                availability: Math.random() > 0.3 ? 'available' : 'busy',
                joinedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
                responseTime: Math.floor(Math.random() * 24) + 1,
                portfolio: this.generatePortfolio(),
                reviews: this.generateReviews()
            };
            
            this.freelancers.push(freelancer);
        }
        
        localStorage.setItem('freelancers', JSON.stringify(this.freelancers));
    }

    getRandomAvatar() {
        const avatars = [
            '1472099645785-5658abf4ff4e', '1494790108755-2616b612b786', '1507003211169-0a1dd7228f2d',
            '1438761681033-6461ffad8d80', '1500648767791-00dcc994a43e', '1544005313-94ddf0286df2',
            '1506794778202-cad84cf45f1d', '1573496359142-b8d87734a5a2', '1580489944761-15a19d654956',
            '1535713875002-d1d0cf227877', '1527980965255-d3b416303d12', '1599566150163-29194dcaad36'
        ];
        return avatars[Math.floor(Math.random() * avatars.length)];
    }

    getRandomSkills(skillsArray, min, max) {
        const count = Math.floor(Math.random() * (max - min + 1)) + min;
        const shuffled = [...skillsArray].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    generatePortfolio() {
        const portfolioItems = [];
        const itemCount = Math.floor(Math.random() * 6) + 2;
        
        for (let i = 0; i < itemCount; i++) {
            portfolioItems.push({
                id: i + 1,
                title: `Project ${i + 1}`,
                description: 'A showcase of my work and expertise',
                image: `https://images.unsplash.com/photo-${this.getRandomProjectImage()}?w=300&h=200&fit=crop`,
                url: '#'
            });
        }
        
        return portfolioItems;
    }

    getRandomProjectImage() {
        const images = [
            '1460925895917-afdab827c52f', '1498050108023-c5b6e66cf4ba', '1547658719-da2b51169166',
            '1551650975-87deedd944c3', '1555066931-4365d14bab8c', '1563013544-824ae1b3529c'
        ];
        return images[Math.floor(Math.random() * images.length)];
    }

    generateReviews() {
        const reviews = [];
        const reviewCount = Math.floor(Math.random() * 5) + 1;
        const clients = ['John D.', 'Sarah M.', 'Mike R.', 'Lisa K.', 'David P.', 'Emma W.'];
        const comments = [
            'Excellent work quality and great communication throughout the project.',
            'Delivered exactly what we needed on time and within budget.',
            'Very professional and skilled. Would definitely hire again.',
            'Outstanding results and attention to detail. Highly recommended.',
            'Great experience working together. Very responsive and talented.'
        ];
        
        for (let i = 0; i < reviewCount; i++) {
            reviews.push({
                id: i + 1,
                client: clients[Math.floor(Math.random() * clients.length)],
                rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
                comment: comments[Math.floor(Math.random() * comments.length)],
                date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)
            });
        }
        
        return reviews;
    }

    setupEventListeners() {
        // Search functionality
        const freelancerSearch = document.getElementById('freelancer-search');
        const categorySelect = document.getElementById('category-select');
        
        if (freelancerSearch) {
            freelancerSearch.addEventListener('input', this.debounce(() => {
                this.currentFilters.search = freelancerSearch.value;
                this.applyFilters();
            }, 300));
        }
        
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                this.currentFilters.category = categorySelect.value;
                this.applyFilters();
            });
        }

        // Sidebar filters
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateFiltersFromCheckboxes();
                this.applyFilters();
            });
        });
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
        // Update rate filters
        const rateCheckboxes = document.querySelectorAll('input[name="rate"]:checked');
        this.currentFilters.rate = Array.from(rateCheckboxes).map(cb => cb.value);

        // Update experience filters
        const experienceCheckboxes = document.querySelectorAll('input[name="experience"]:checked');
        this.currentFilters.experience = Array.from(experienceCheckboxes).map(cb => cb.value);

        // Update rating filters
        const ratingCheckboxes = document.querySelectorAll('input[name="rating"]:checked');
        this.currentFilters.rating = Array.from(ratingCheckboxes).map(cb => cb.value);

        // Update availability filters
        const availabilityCheckboxes = document.querySelectorAll('input[name="availability"]:checked');
        this.currentFilters.availability = Array.from(availabilityCheckboxes).map(cb => cb.value);

        // Update location filters
        const locationCheckboxes = document.querySelectorAll('input[name="location"]:checked');
        this.currentFilters.location = Array.from(locationCheckboxes).map(cb => cb.value);
    }

    applyFilters() {
        this.filteredFreelancers = this.freelancers.filter(freelancer => {
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const matchesSearch = 
                    freelancer.name.toLowerCase().includes(searchTerm) ||
                    freelancer.title.toLowerCase().includes(searchTerm) ||
                    freelancer.skills.some(skill => skill.toLowerCase().includes(searchTerm)) ||
                    freelancer.bio.toLowerCase().includes(searchTerm);
                if (!matchesSearch) return false;
            }

            // Category filter
            if (this.currentFilters.category) {
                if (freelancer.category !== this.currentFilters.category) return false;
            }

            // Rate filter
            if (this.currentFilters.rate.length > 0) {
                const matchesRate = this.currentFilters.rate.some(range => {
                    switch (range) {
                        case '0-25': return freelancer.hourlyRate <= 25;
                        case '25-50': return freelancer.hourlyRate > 25 && freelancer.hourlyRate <= 50;
                        case '50-100': return freelancer.hourlyRate > 50 && freelancer.hourlyRate <= 100;
                        case '100+': return freelancer.hourlyRate > 100;
                        default: return true;
                    }
                });
                if (!matchesRate) return false;
            }

            // Experience filter
            if (this.currentFilters.experience.length > 0) {
                if (!this.currentFilters.experience.includes(freelancer.experience)) return false;
            }

            // Rating filter
            if (this.currentFilters.rating.length > 0) {
                const matchesRating = this.currentFilters.rating.some(range => {
                    const rating = parseFloat(freelancer.rating);
                    switch (range) {
                        case '4.5+': return rating >= 4.5;
                        case '4.0+': return rating >= 4.0;
                        case '3.5+': return rating >= 3.5;
                        default: return true;
                    }
                });
                if (!matchesRating) return false;
            }

            // Availability filter
            if (this.currentFilters.availability.length > 0) {
                if (!this.currentFilters.availability.includes(freelancer.availability)) return false;
            }

            // Location filter
            if (this.currentFilters.location.length > 0) {
                const matchesLocation = this.currentFilters.location.some(loc => {
                    switch (loc) {
                        case 'remote': return freelancer.location === 'Remote';
                        case 'us': return freelancer.location.includes('USA');
                        case 'europe': return ['UK', 'Germany', 'France', 'Spain', 'Netherlands'].some(country => 
                            freelancer.location.includes(country));
                        case 'asia': return ['Japan', 'Singapore', 'India'].some(country => 
                            freelancer.location.includes(country));
                        default: return true;
                    }
                });
                if (!matchesLocation) return false;
            }

            return true;
        });

        this.sortFreelancers(this.currentSort);
        this.currentPage = 1;
        this.displayFreelancers();
        this.updateResultsInfo();
    }

    sortFreelancers(sortBy) {
        this.currentSort = sortBy;
        
        this.filteredFreelancers.sort((a, b) => {
            switch (sortBy) {
                case 'rating':
                    return parseFloat(b.rating) - parseFloat(a.rating);
                case 'rate-low':
                    return a.hourlyRate - b.hourlyRate;
                case 'rate-high':
                    return b.hourlyRate - a.hourlyRate;
                case 'recent':
                    return new Date(b.joinedDate) - new Date(a.joinedDate);
                case 'jobs':
                    return b.completedJobs - a.completedJobs;
                default:
                    return 0;
            }
        });
        
        this.displayFreelancers();
    }

    displayFreelancers() {
        const freelancersGrid = document.getElementById('freelancers-grid');
        const startIndex = (this.currentPage - 1) * this.freelancersPerPage;
        const endIndex = startIndex + this.freelancersPerPage;
        const freelancersToShow = this.filteredFreelancers.slice(0, endIndex);

        freelancersGrid.innerHTML = freelancersToShow.map(freelancer => this.createFreelancerCard(freelancer)).join('');

        // Update load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (endIndex >= this.filteredFreelancers.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
    }

    createFreelancerCard(freelancer) {
        return `
            <div class="freelancer-card" onclick="freelancerBrowser.showFreelancerProfile('${freelancer.id}')">>
                <div class="availability-badge ${freelancer.availability}">
                    ${freelancer.availability === 'available' ? 'Available' : 'Busy'}
                </div>
                
                <div class="freelancer-header">
                    <div class="freelancer-avatar">
                        <img src="${freelancer.avatar}" alt="${freelancer.name}">
                    </div>
                    <div class="freelancer-info">
                        <h3 class="freelancer-name">${freelancer.name}</h3>
                        <p class="freelancer-title">${freelancer.title}</p>
                        <div class="freelancer-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${freelancer.location}</span>
                        </div>
                    </div>
                </div>
                
                <div class="freelancer-rating">
                    <div class="rating-stars">
                        ${this.generateStars(parseFloat(freelancer.rating))}
                    </div>
                    <span class="rating-text">${freelancer.rating} (${freelancer.reviewCount} reviews)</span>
                </div>
                
                <div class="freelancer-stats">
                    <div class="stat-item">
                        <span class="stat-value">${freelancer.completedJobs}</span>
                        <span class="stat-label">Jobs Done</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${freelancer.responseTime}h</span>
                        <span class="stat-label">Response Time</span>
                    </div>
                </div>
                
                <div class="freelancer-rate">
                    <div class="rate-amount">$${freelancer.hourlyRate}</div>
                    <div class="rate-period">per hour</div>
                </div>
                
                <div class="freelancer-skills">
                    <h4>Top Skills</h4>
                    <div class="skills-list">
                        ${freelancer.skills.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        ${freelancer.skills.length > 4 ? `<span class="skill-tag">+${freelancer.skills.length - 4} more</span>` : ''}
                    </div>
                </div>
                
                <div class="freelancer-description">
                    ${freelancer.bio}
                </div>
                
                <div class="freelancer-actions">
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); freelancerBrowser.saveFreelancer('${freelancer.id}')">
                        <i class="fas fa-heart"></i> Save
                    </button>
                    ${talentSync.currentUser && talentSync.currentUser.role === 'client' ? 
                        `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); freelancerBrowser.showHireModal('${freelancer.id}')">
                            <i class="fas fa-handshake"></i> Hire
                        </button>` : 
                        `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); freelancerBrowser.showFreelancerProfile('${freelancer.id}')">
                            View Profile
                        </button>`
                    }
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

    updateResultsInfo() {
        const resultsCount = document.getElementById('results-count');
        const resultsDescription = document.getElementById('results-description');
        
        resultsCount.textContent = `${this.filteredFreelancers.length} freelancers found`;
        resultsDescription.textContent = this.filteredFreelancers.length > 0 
            ? 'Browse through talented professionals' 
            : 'Try adjusting your filters to see more results';
    }

    loadFreelancers() {
        const storedFreelancers = localStorage.getItem('freelancers');
        if (storedFreelancers) {
            this.freelancers = JSON.parse(storedFreelancers);
        }
        
        this.filteredFreelancers = [...this.freelancers];
        this.sortFreelancers('rating');
        this.displayFreelancers();
        this.updateResultsInfo();
    }

    loadMoreFreelancers() {
        this.currentPage++;
        this.displayFreelancers();
    }

    performSearch() {
        const searchInput = document.getElementById('freelancer-search');
        const categorySelect = document.getElementById('category-select');
        
        this.currentFilters.search = searchInput.value;
        this.currentFilters.category = categorySelect.value;
        
        this.applyFilters();
        
        if (searchInput.value || categorySelect.value) {
            talentSync.showToast('Search completed!', 'success');
        }
    }

    clearFilters() {
        this.currentFilters = {
            search: '',
            category: '',
            rate: [],
            experience: [],
            rating: [],
            availability: [],
            location: []
        };
        
        document.getElementById('freelancer-search').value = '';
        document.getElementById('category-select').value = '';
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        
        this.applyFilters();
        talentSync.showToast('Filters cleared', 'success');
    }

    showFreelancerProfile(freelancerId) {
        const freelancer = this.freelancers.find(f => f.id == freelancerId);
        if (!freelancer) return;

        const modalContent = `
            <div class="profile-header">
                <div class="profile-avatar">
                    <img src="${freelancer.avatar}" alt="${freelancer.name}">
                </div>
                <div class="profile-info">
                    <h2>${freelancer.name}</h2>
                    <p>${freelancer.title}</p>
                    <div class="profile-rating">
                        <div class="rating-stars">
                            ${this.generateStars(parseFloat(freelancer.rating))}
                        </div>
                        <span>${freelancer.rating} (${freelancer.reviewCount} reviews)</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-content">
                <div class="profile-main">
                    <div class="profile-section">
                        <h3>About</h3>
                        <p>${freelancer.bio}</p>
                    </div>
                    
                    <div class="profile-section">
                        <h3>Skills</h3>
                        <div class="skills-list">
                            ${freelancer.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3>Portfolio</h3>
                        <div class="portfolio-grid">
                            ${freelancer.portfolio.map(item => `
                                <div class="portfolio-item">
                                    <img src="${item.image}" alt="${item.title}">
                                    <div class="portfolio-item-content">
                                        <h4>${item.title}</h4>
                                        <p>${item.description}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3>Reviews</h3>
                        <div class="reviews-list">
                            ${freelancer.reviews.map(review => `
                                <div class="review-item">
                                    <div class="review-header">
                                        <span class="review-client">${review.client}</span>
                                        <div class="review-rating">
                                            ${this.generateStars(review.rating)}
                                        </div>
                                    </div>
                                    <p class="review-text">${review.comment}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="profile-sidebar">
                    <div class="profile-section">
                        <h3>Rate</h3>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 700; color: var(--primary-color);">
                                $${freelancer.hourlyRate}
                            </div>
                            <div style="color: var(--text-secondary);">per hour</div>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3>Stats</h3>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Location:</span>
                                <span>${freelancer.location}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Jobs completed:</span>
                                <span>${freelancer.completedJobs}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Response time:</span>
                                <span>${freelancer.responseTime} hours</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Member since:</span>
                                <span>${new Date(freelancer.joinedDate).getFullYear()}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${talentSync.currentUser && talentSync.currentUser.role === 'client' ? `
                        <div style="text-align: center;">
                            <button class="btn btn-primary" onclick="freelancerBrowser.showHireModal('${freelancer.id}')" style="width: 100%; margin-bottom: 1rem;">
                                <i class="fas fa-handshake"></i> Hire ${freelancer.name.split(' ')[0]}
                            </button>
                            <button class="btn btn-outline" onclick="freelancerBrowser.contactFreelancer('${freelancer.id}')" style="width: 100%;">
                                <i class="fas fa-envelope"></i> Send Message
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.getElementById('freelancer-modal-content').innerHTML = modalContent;
        document.getElementById('freelancer-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeFreelancerModal() {
        document.getElementById('freelancer-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    showHireModal(freelancerId) {
        if (!talentSync.currentUser || talentSync.currentUser.role !== 'client') {
            talentSync.showToast('Please login as a client to hire freelancers', 'error');
            return;
        }

        this.currentFreelancerId = freelancerId;
        document.getElementById('hire-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset form
        document.getElementById('hire-form').reset();
    }

    closeHireModal() {
        document.getElementById('hire-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        this.currentFreelancerId = null;
    }

    sendHireRequest(event) {
        event.preventDefault();
        
        if (!talentSync.currentUser || !this.currentFreelancerId) {
            talentSync.showToast('Please login to send hire requests', 'error');
            return;
        }

        if (talentSync.currentUser.role !== 'client') {
            talentSync.showToast('Only clients can hire freelancers', 'error');
            return;
        }

        const formData = new FormData(event.target);
        const freelancer = this.freelancers.find(f => f.id == this.currentFreelancerId);
        
        if (!freelancer) {
            talentSync.showToast('Freelancer not found', 'error');
            return;
        }
        
        const hireRequest = {
            id: Date.now(),
            freelancerId: this.currentFreelancerId,
            clientId: talentSync.currentUser.id,
            clientName: talentSync.currentUser.fullName,
            clientAvatar: talentSync.currentUser.profile.avatar,
            projectTitle: formData.get('projectTitle'),
            projectDescription: formData.get('projectDescription'),
            budgetType: formData.get('budgetType'),
            budgetAmount: parseFloat(formData.get('budgetAmount')),
            projectDuration: formData.get('projectDuration'),
            message: formData.get('message'),
            status: 'pending',
            sentDate: new Date().toISOString()
        };

        // Store hire request
        const hireRequests = JSON.parse(localStorage.getItem('hireRequests') || '[]');
        hireRequests.push(hireRequest);
        localStorage.setItem('hireRequests', JSON.stringify(hireRequests));

        // Send message to freelancer
        const messageText = `Hi! I'd like to hire you for: ${hireRequest.projectTitle}\n\n${hireRequest.projectDescription}\n\nBudget: $${hireRequest.budgetAmount} (${hireRequest.budgetType})\nDuration: ${hireRequest.projectDuration}\n\n${hireRequest.message || ''}`;
        
        const message = {
            conversationId: `${talentSync.currentUser.id}_${freelancer.uid || this.currentFreelancerId}`,
            senderId: talentSync.currentUser.id,
            senderName: talentSync.currentUser.fullName,
            senderAvatar: talentSync.currentUser.profile.avatar,
            receiverId: freelancer.uid || this.currentFreelancerId,
            receiverName: freelancer.name,
            receiverAvatar: freelancer.avatar,
            message: messageText,
            timestamp: new Date().toISOString(),
            read: false
        };

        // Store message in Firestore
        console.log('Freelancer data:', { id: freelancer.id, uid: freelancer.uid, name: freelancer.name });
        console.log('Receiver ID:', freelancer.uid || this.currentFreelancerId);
        console.log('Message to send:', message);
        
        if (firebaseService && firebaseService.db) {
            console.log('Firebase service available, sending message...');
            firebaseService.saveMessage(message).then(result => {
                if (result.success) {
                    console.log('✓ Message sent successfully to Firestore with ID:', result.id);
                } else {
                    console.error('✗ Failed to send message:', result.error);
                }
            }).catch(error => {
                console.error('✗ Error sending message:', error);
            });
        } else {
            console.error('✗ Firebase not available, message not sent');
        }

        this.closeHireModal();
        talentSync.showToast('Hire request sent successfully!', 'success');
    }

    saveFreelancer(freelancerId) {
        if (!talentSync.currentUser) {
            talentSync.showToast('Please login to save freelancers', 'error');
            return;
        }

        const savedFreelancers = JSON.parse(localStorage.getItem(`savedFreelancers_${talentSync.currentUser.id}`) || '[]');
        
        if (!savedFreelancers.includes(freelancerId)) {
            savedFreelancers.push(freelancerId);
            localStorage.setItem(`savedFreelancers_${talentSync.currentUser.id}`, JSON.stringify(savedFreelancers));
            talentSync.showToast('Freelancer saved to your favorites!', 'success');
        } else {
            talentSync.showToast('Freelancer already in your favorites', 'info');
        }
    }

    contactFreelancer(freelancerId) {
        if (!talentSync.currentUser) {
            talentSync.showToast('Please login to contact freelancers', 'error');
            return;
        }
        
        talentSync.showToast('Redirecting to messages...', 'info');
        setTimeout(() => {
            window.location.href = 'messages.html';
        }, 1000);
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear user data
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('currentUser');
            
            // Sign out from Firebase if available
            if (typeof firebaseService !== 'undefined' && firebaseService.signOut) {
                firebaseService.signOut().then(() => {
                    console.log('Firebase logout successful');
                }).catch((error) => {
                    console.error('Firebase logout error:', error);
                });
            }
            
            // Clear talentSync current user
            if (typeof talentSync !== 'undefined') {
                talentSync.currentUser = null;
            }
            
            // Redirect to home page
            console.log('Logging out and redirecting to home page');
            window.location.href = 'index.html';
        }
    }
}

// Initialize freelancer browser when page loads
const freelancerBrowser = new FreelancerBrowser();

// Make it globally available
window.freelancerBrowser = freelancerBrowser;
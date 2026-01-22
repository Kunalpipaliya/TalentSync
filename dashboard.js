// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.currentSection = 'dashboard-overview';
        this.init();
    }

    init() {
        // Wait for talentSync to be initialized and user session to be loaded
        if (typeof talentSync !== 'undefined') {
            // Wait for user session to be loaded (especially important for Firebase auth)
            this.waitForUserAuth();
        } else {
            // Retry after a short delay
            setTimeout(() => this.init(), 100);
        }
    }

    async waitForUserAuth() {
        console.log('Dashboard: Waiting for user authentication...');
        
        // Also listen for the userLoaded event
        const userLoadedPromise = new Promise((resolve) => {
            const handleUserLoaded = (event) => {
                console.log('Dashboard: User loaded event received');
                window.removeEventListener('userLoaded', handleUserLoaded);
                resolve(true);
            };
            window.addEventListener('userLoaded', handleUserLoaded);
            
            // Remove listener after timeout
            setTimeout(() => {
                window.removeEventListener('userLoaded', handleUserLoaded);
                resolve(false);
            }, 5000);
        });
        
        let attempts = 0;
        const maxAttempts = 50; // Wait up to 5 seconds
        
        while (attempts < maxAttempts) {
            // Check if user is authenticated
            if (talentSync.currentUser) {
                console.log('Dashboard: User authenticated, initializing dashboard');
                this.setupNavigation();
                this.populateUserInfo();
                this.setupSidebar();
                this.loadDashboardData();
                this.setupEventListeners();
                return;
            }
            
            // Check if Firebase is still initializing
            if (firebaseService && firebaseService.auth) {
                const firebaseUser = firebaseService.auth.currentUser;
                if (firebaseUser) {
                    console.log('Dashboard: Firebase user found, waiting for profile load...');
                    // Wait for either the user to be loaded or the event to fire
                    const userLoaded = await Promise.race([
                        userLoadedPromise,
                        new Promise(resolve => setTimeout(() => resolve(false), 1000))
                    ]);
                    
                    if (userLoaded || talentSync.currentUser) {
                        console.log('Dashboard: User profile loaded, initializing dashboard');
                        this.setupNavigation();
                        this.populateUserInfo();
                        this.setupSidebar();
                        this.loadDashboardData();
                        this.setupEventListeners();
                        return;
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // If we get here, no user was found after waiting
        console.log('Dashboard: No authenticated user found, redirecting to home');
        this.redirectToLogin();
    }

    redirectToLogin() {
        // Show a message and redirect
        if (typeof talentSync !== 'undefined' && talentSync.showToast) {
            talentSync.showToast('Please log in to access the dashboard', 'info');
        }
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    checkUserAuth() {
        if (!talentSync.currentUser) {
            console.log('Dashboard: No user found in checkUserAuth');
            return false;
        }
        return true;
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

    populateUserInfo() {
        if (!talentSync.currentUser) {
            console.error('Dashboard: No current user found when populating user info');
            return;
        }

        try {
            // Update user info in sidebar
            const userAvatar = document.getElementById('user-avatar');
            const userName = document.getElementById('user-name');
            const userRole = document.getElementById('user-role');
            
            if (userAvatar) userAvatar.src = talentSync.currentUser.profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';
            if (userName) userName.textContent = talentSync.currentUser.fullName || 'User';
            if (userRole) userRole.textContent = talentSync.currentUser.role || 'User';

            // Update profile section
            const profileAvatar = document.getElementById('profile-avatar');
            const profileName = document.getElementById('profile-name');
            const profileTitle = document.getElementById('profile-title');
            const profileBio = document.getElementById('profile-bio');
            
            if (profileAvatar) profileAvatar.src = talentSync.currentUser.profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';
            if (profileName) profileName.textContent = talentSync.currentUser.fullName || 'User';
            if (profileTitle) profileTitle.textContent = this.getProfileTitle();
            if (profileBio) profileBio.textContent = talentSync.currentUser.profile?.bio || 'No bio available';

            // Update profile rating
            const profileRating = document.getElementById('profile-rating');
            if (profileRating) {
                if (talentSync.currentUser.profile?.rating > 0) {
                    profileRating.innerHTML = `
                        <div class="stars">${this.generateStars(talentSync.currentUser.profile.rating)}</div>
                        <span>${talentSync.currentUser.profile.rating} (${talentSync.currentUser.profile.reviews?.length || 0} reviews)</span>
                    `;
                } else {
                    profileRating.innerHTML = '<span>No ratings yet</span>';
                }
            }

            // Update skills
            const skillsList = document.getElementById('skills-list');
            if (skillsList) {
                if (talentSync.currentUser.profile?.skills && talentSync.currentUser.profile.skills.length > 0) {
                    skillsList.innerHTML = talentSync.currentUser.profile.skills
                        .map(skill => `<span class="skill-tag">${skill}</span>`)
                        .join('');
                } else {
                    skillsList.innerHTML = '<p>No skills added yet</p>';
                }
            }
            
            console.log('Dashboard: User info populated successfully');
        } catch (error) {
            console.error('Dashboard: Error populating user info:', error);
        }
    }

    getProfileTitle() {
        if (!talentSync.currentUser) return 'User';
        
        if (talentSync.currentUser.role === 'freelancer') {
            return talentSync.currentUser.profile?.skills && talentSync.currentUser.profile.skills.length > 0 
                ? talentSync.currentUser.profile.skills[0] + ' Specialist'
                : 'Freelancer';
        } else {
            return 'Client';
        }
    }

    setupSidebar() {
        const sidebarMenu = document.getElementById('sidebar-menu');
        let menuItems = [];

        if (talentSync.currentUser.role === 'freelancer') {
            menuItems = [
                { id: 'dashboard-overview', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
                { id: 'profile-section', icon: 'fas fa-user', text: 'My Profile' },
                { id: 'jobs-section', icon: 'fas fa-briefcase', text: 'My Jobs' },
                { id: 'proposals-section', icon: 'fas fa-paper-plane', text: 'My Proposals' },
                { id: 'earnings-section', icon: 'fas fa-dollar-sign', text: 'Earnings' },
                { id: 'settings-section', icon: 'fas fa-cog', text: 'Settings' }
            ];
        } else {
            menuItems = [
                { id: 'dashboard-overview', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
                { id: 'profile-section', icon: 'fas fa-user', text: 'My Profile' },
                { id: 'jobs-section', icon: 'fas fa-briefcase', text: 'Posted Jobs' },
                { id: 'proposals-section', icon: 'fas fa-paper-plane', text: 'Received Proposals' },
                { id: 'earnings-section', icon: 'fas fa-dollar-sign', text: 'Spending' },
                { id: 'settings-section', icon: 'fas fa-cog', text: 'Settings' }
            ];
        }

        sidebarMenu.innerHTML = menuItems.map(item => `
            <li>
                <a href="#" onclick="dashboard.showSection('${item.id}')" 
                   class="${item.id === this.currentSection ? 'active' : ''}">
                    <i class="${item.icon}"></i>
                    <span>${item.text}</span>
                </a>
            </li>
        `).join('');
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionId).classList.add('active');

        // Update sidebar active state
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[onclick="dashboard.showSection('${sectionId}')"]`).classList.add('active');

        this.currentSection = sectionId;

        // Load section-specific data
        this.loadSectionData(sectionId);
    }

    async loadDashboardData() {
        await this.loadStats();
        this.loadQuickActions();
        this.loadRecentActivity();
        await this.loadJobs();
        await this.loadProposals();
        this.loadEarnings();
        
        // Set up real-time listeners
        this.setupRealtimeListeners();
    }

    setupRealtimeListeners() {
        if (!talentSync.useFirebase || !firebaseService || !talentSync.currentUser) return;

        const userId = talentSync.currentUser.id || talentSync.currentUser.uid;

        // Listen to user's jobs
        if (talentSync.currentUser.role === 'client') {
            this.jobsListener = firebaseService.listenToUserJobs(userId, (snapshot) => {
                console.log('User jobs updated in real-time');
                this.loadClientJobs(); // Refresh jobs display
            });
        }

        // Listen to user's proposals
        if (talentSync.currentUser.role === 'freelancer') {
            this.proposalsListener = firebaseService.listenToUserProposals(userId, (snapshot) => {
                console.log('User proposals updated in real-time');
                this.loadProposals(); // Refresh proposals display
            });
        }
    }

    cleanup() {
        // Clean up listeners when leaving dashboard
        if (this.jobsListener) {
            this.jobsListener();
            this.jobsListener = null;
        }
        if (this.proposalsListener) {
            this.proposalsListener();
            this.proposalsListener = null;
        }
    }

    async loadStats() {
        const statsGrid = document.getElementById('stats-grid');
        let stats = [];

        if (talentSync.currentUser.role === 'freelancer') {
            // Load real data for freelancers
            let proposals = [];
            if (talentSync.useFirebase && firebaseService) {
                const result = await firebaseService.loadProposals({ 
                    freelancerId: talentSync.currentUser.id || talentSync.currentUser.uid 
                });
                if (result.success) {
                    proposals = result.data;
                }
            } else {
                proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
                proposals = proposals.filter(p => p.freelancerId === talentSync.currentUser.id);
            }
            
            const acceptedProposals = proposals.filter(p => p.status === 'accepted');
            
            stats = [
                {
                    title: 'Total Earnings',
                    value: '$' + (talentSync.currentUser.profile.totalEarnings || 0),
                    change: '+12%',
                    positive: true,
                    icon: 'fas fa-dollar-sign',
                    color: '#10b981'
                },
                {
                    title: 'Active Projects',
                    value: talentSync.currentUser.profile.activeProjects || 0,
                    change: '+2',
                    positive: true,
                    icon: 'fas fa-briefcase',
                    color: '#6366f1'
                },
                {
                    title: 'Completed Jobs',
                    value: talentSync.currentUser.profile.completedJobs || 0,
                    change: '+5',
                    positive: true,
                    icon: 'fas fa-check-circle',
                    color: '#f59e0b'
                },
                {
                    title: 'Client Rating',
                    value: (talentSync.currentUser.profile.rating || 0).toFixed(1),
                    change: '+0.1',
                    positive: true,
                    icon: 'fas fa-star',
                    color: '#ef4444'
                }
            ];
        } else {
            // Load real data for clients
            let jobs = [];
            if (talentSync.useFirebase && firebaseService) {
                const result = await firebaseService.loadJobs({ 
                    clientId: talentSync.currentUser.id || talentSync.currentUser.uid 
                });
                if (result.success) {
                    jobs = result.data;
                }
            } else {
                jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
                jobs = jobs.filter(j => j.clientId === (talentSync.currentUser.id || talentSync.currentUser.uid));
            }
            
            const hireRequests = JSON.parse(localStorage.getItem('hireRequests') || '[]');
            const userHires = hireRequests.filter(h => h.clientId === (talentSync.currentUser.id || talentSync.currentUser.uid));
            
            stats = [
                {
                    title: 'Total Spent',
                    value: '$' + (talentSync.currentUser.profile.totalSpent || 0),
                    change: '+8%',
                    positive: false,
                    icon: 'fas fa-credit-card',
                    color: '#ef4444'
                },
                {
                    title: 'Active Projects',
                    value: talentSync.currentUser.profile.activeProjects || 0,
                    change: '+1',
                    positive: true,
                    icon: 'fas fa-briefcase',
                    color: '#6366f1'
                },
                {
                    title: 'Posted Jobs',
                    /* FIXED: userJobs was undefined; should use loaded jobs */
                    value: jobs.length,
                    change: '+3',
                    positive: true,
                    icon: 'fas fa-plus-circle',
                    color: '#10b981'
                },
                {
                    title: 'Hired Freelancers',
                    value: userHires.length,
                    change: '+2',
                    positive: true,
                    icon: 'fas fa-users',
                    color: '#f59e0b'
                }
            ];
        }

        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">${stat.title}</span>
                    <div class="stat-card-icon" style="background: ${stat.color}">
                        <i class="${stat.icon}"></i>
                    </div>
                </div>
                <div class="stat-card-value">${stat.value}</div>
                <div class="stat-card-change ${stat.positive ? 'positive' : 'negative'}">
                    <i class="fas fa-arrow-${stat.positive ? 'up' : 'down'}"></i>
                    <span>${stat.change} from last month</span>
                </div>
            </div>
        `).join('');
    }

    loadQuickActions() {
        const actionsGrid = document.getElementById('actions-grid');
        let actions = [];

        if (talentSync.currentUser.role === 'freelancer') {
            actions = [
                {
                    icon: 'fas fa-search',
                    title: 'Browse Jobs',
                    description: 'Find new opportunities',
                    action: 'browseJobs'
                },
                {
                    icon: 'fas fa-edit',
                    title: 'Update Profile',
                    description: 'Keep your profile current',
                    action: 'editProfile'
                },
                {
                    icon: 'fas fa-paper-plane',
                    title: 'Submit Proposal',
                    description: 'Apply to a job',
                    action: 'submitProposal'
                },
                {
                    icon: 'fas fa-comments',
                    title: 'Messages',
                    description: 'Chat with clients',
                    action: 'openMessages'
                }
            ];
        } else {
            actions = [
                {
                    icon: 'fas fa-plus',
                    title: 'Post a Job',
                    description: 'Find the right freelancer',
                    action: 'postJob'
                },
                {
                    icon: 'fas fa-users',
                    title: 'Browse Talent',
                    description: 'Discover freelancers',
                    action: 'browseTalent'
                },
                {
                    icon: 'fas fa-eye',
                    title: 'View Proposals',
                    description: 'Review applications',
                    action: 'viewProposals'
                },
                {
                    icon: 'fas fa-comments',
                    title: 'Messages',
                    description: 'Chat with freelancers',
                    action: 'openMessages'
                }
            ];
        }

        actionsGrid.innerHTML = actions.map(action => `
            <div class="action-card" onclick="dashboard.${action.action}()">
                <i class="${action.icon}"></i>
                <h3>${action.title}</h3>
                <p>${action.description}</p>
            </div>
        `).join('');
    }

    loadRecentActivity() {
        const activityList = document.getElementById('activity-list');
        
        // Sample activity data
        const activities = [
            {
                icon: 'fas fa-briefcase',
                iconColor: '#6366f1',
                title: 'New project started',
                description: 'E-commerce website development',
                time: '2 hours ago'
            },
            {
                icon: 'fas fa-dollar-sign',
                iconColor: '#10b981',
                title: 'Payment received',
                description: '$500 from Mobile App Project',
                time: '1 day ago'
            },
            {
                icon: 'fas fa-star',
                iconColor: '#f59e0b',
                title: 'New review received',
                description: '5-star rating from John Smith',
                time: '2 days ago'
            },
            {
                icon: 'fas fa-paper-plane',
                iconColor: '#ef4444',
                title: 'Proposal submitted',
                description: 'Web Development Project',
                time: '3 days ago'
            }
        ];

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${activity.iconColor}">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `).join('');
    }

    async loadJobs() {
        const jobsGrid = document.getElementById('jobs-grid');
        const jobsTitle = document.getElementById('jobs-title');
        
        if (talentSync.currentUser.role === 'freelancer') {
            jobsTitle.textContent = 'My Jobs';
            // Load freelancer jobs
            await this.loadFreelancerJobs();
        } else {
            jobsTitle.textContent = 'Posted Jobs';
            // Load client jobs
            await this.loadClientJobs();
        }
    }

    async loadFreelancerJobs() {
        const jobsGrid = document.getElementById('jobs-grid');
        
        let jobs = [];
        if (talentSync.useFirebase && firebaseService) {
            // Load accepted proposals from Firebase
            const result = await firebaseService.loadProposals({ 
                freelancerId: talentSync.currentUser.id || talentSync.currentUser.uid,
                status: 'accepted'
            });
            if (result.success) {
                jobs = result.data.map(proposal => ({
                    id: proposal.id,
                    title: proposal.jobTitle || 'Project',
                    client: proposal.clientName || 'Client',
                    status: proposal.projectStatus || 'In Progress',
                    budget: `$${proposal.budget || 0}`,
                    deadline: proposal.deadline || new Date().toISOString().split('T')[0],
                    progress: proposal.progress || 50
                }));
            }
        } else {
            // Fallback to sample data
            jobs = [
                {
                    id: 1,
                    title: 'E-commerce Website Development',
                    client: 'TechStart Inc.',
                    status: 'In Progress',
                    budget: '$2,500',
                    deadline: '2024-02-15',
                    progress: 65
                },
                {
                    id: 2,
                    title: 'Mobile App UI Design',
                    client: 'StartupXYZ',
                    status: 'Completed',
                    budget: '$1,200',
                    deadline: '2024-01-20',
                    progress: 100
                },
                {
                    id: 3,
                    title: 'Logo Design Project',
                    client: 'Creative Agency',
                    status: 'Review',
                    budget: '$500',
                    deadline: '2024-01-30',
                    progress: 90
                }
            ];
        }

        jobsGrid.innerHTML = jobs.map(job => `
            <div class="job-card">
                <div class="job-card-header">
                    <div>
                        <h3 class="job-card-title">${job.title}</h3>
                        <div class="job-card-meta">
                            <span><i class="fas fa-user"></i> ${job.client}</span>
                            <span><i class="fas fa-calendar"></i> Due: ${job.deadline}</span>
                        </div>
                    </div>
                    <span class="badge badge-${this.getStatusColor(job.status)}">${job.status}</span>
                </div>
                <div class="job-card-description">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${job.progress}%"></div>
                    </div>
                    <small>${job.progress}% Complete</small>
                </div>
                <div class="job-card-footer">
                    <span class="job-card-budget">${job.budget}</span>
                    <div>
                        <button class="btn btn-outline btn-sm" onclick="dashboard.viewJob(${JSON.stringify(job.id)})">View</button>
                        <button class="btn btn-primary btn-sm" onclick="dashboard.updateJob(${JSON.stringify(job.id)})">Update</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadClientJobs() {
        const jobsGrid = document.getElementById('jobs-grid');
        
        let jobs = [];
        // FIXED: Prefer Firestore whenever available, regardless of talentSync.useFirebase flag
        if (firebaseService && firebaseService.db) {
            console.log('Dashboard: loading client jobs from Firestore...');
            const result = await firebaseService.loadJobs({
                clientId: talentSync.currentUser.id || talentSync.currentUser.uid,
            });
            if (result.success && Array.isArray(result.data)) {
                console.log('Dashboard: Firestore jobs loaded for client:', result.data.length);
                jobs = result.data.map((job) => {
                    // Normalize budget display using unified job.budget from firebase-config
                    let budgetLabel = 'N/A';
                    if (job.budget && typeof job.budget.min !== 'undefined') {
                        budgetLabel =
                            job.budget.type === 'fixed'
                                ? `$${job.budget.min} - $${job.budget.max}`
                                : `$${job.budget.min} - $${job.budget.max}/hr`;
                    } else if (typeof job.budgetMin !== 'undefined') {
                        // Backward-compat with older shape
                        budgetLabel =
                            job.budgetType === 'fixed'
                                ? `$${job.budgetMin} - $${job.budgetMax}`
                                : `$${job.hourlyMin} - $${job.hourlyMax}/hr`;
                    }

                    return {
                        id: job.id,
                        title: job.title,
                        proposals: job.proposals || 0,
                        status: job.status || 'Active',
                        budget: budgetLabel,
                        posted: job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Unknown',
                        hired: job.hiredFreelancer || null,
                    };
                });
            } else {
                console.warn('Dashboard: Firestore loadJobs returned no data or failed:', result.error);
            }
        } else {
            // Fallback to sample data
            jobs = [
                {
                    id: 1,
                    title: 'React Developer Needed',
                    proposals: 12,
                    status: 'Active',
                    budget: '$3,000',
                    posted: '2024-01-10',
                    hired: 'Sarah Johnson'
                },
                {
                    id: 2,
                    title: 'Logo Design for Startup',
                    proposals: 8,
                    status: 'Completed',
                    budget: '$800',
                    posted: '2024-01-05',
                    hired: 'Mike Chen'
                },
                {
                    id: 3,
                    title: 'Content Writer for Blog',
                    proposals: 15,
                    status: 'In Review',
                    budget: '$1,500',
                    posted: '2024-01-12',
                    hired: null
                }
            ];
        }

        // FIXED: Show message if no jobs found
        if (jobs.length === 0) {
            jobsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-briefcase" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No jobs posted yet</h3>
                    <p>Start by posting your first job to find talented freelancers.</p>
                    <button class="btn btn-primary" onclick="window.location.href='post-job.html'" style="margin-top: 1rem;">
                        <i class="fas fa-plus"></i> Post a Job
                    </button>
                </div>
            `;
            return;
        }

        jobsGrid.innerHTML = jobs.map(job => `
            <div class="job-card">
                <div class="job-card-header">
                    <div>
                        <h3 class="job-card-title">${job.title}</h3>
                        <div class="job-card-meta">
                            <span><i class="fas fa-paper-plane"></i> ${job.proposals} proposals</span>
                            <span><i class="fas fa-calendar"></i> Posted: ${job.posted}</span>
                            ${job.hired ? `<span><i class="fas fa-user-check"></i> Hired: ${job.hired}</span>` : ''}
                        </div>
                    </div>
                    <span class="badge badge-${this.getStatusColor(job.status)}">${job.status}</span>
                </div>
                <div class="job-card-footer">
                    <span class="job-card-budget">${job.budget}</span>
                    <div>
                        <button class="btn btn-outline btn-sm" onclick="dashboard.viewJob(${JSON.stringify(job.id)})">View</button>
                        <button class="btn btn-primary btn-sm" onclick="dashboard.manageJob(${JSON.stringify(job.id)})">Manage</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadProposals() {
        const proposalsList = document.getElementById('proposals-list');
        
        let proposals = [];
        const userId = talentSync.currentUser.id || talentSync.currentUser.uid;
        
        if (firebaseService && firebaseService.loadProposals) {
            let filters = {};
            
            if (talentSync.currentUser.role === 'freelancer') {
                // Load proposals sent by this freelancer
                filters.freelancerId = userId;
            } else {
                // Load proposals received by this client
                filters.clientId = userId;
            }
            
            const result = await firebaseService.loadProposals(filters);
            if (result.success) {
                proposals = result.data;
                console.log(`Loaded ${proposals.length} proposals for ${talentSync.currentUser.role}`);
            } else {
                console.error('Failed to load proposals:', result.error);
            }
        } else {
            // Fallback to localStorage
            const allProposals = JSON.parse(localStorage.getItem('proposals') || '[]');
            
            if (talentSync.currentUser.role === 'freelancer') {
                proposals = allProposals.filter(p => p.freelancerId === userId);
            } else {
                proposals = allProposals.filter(p => p.clientId === userId);
            }
        }

        if (proposals.length === 0) {
            const emptyMessage = talentSync.currentUser.role === 'freelancer' 
                ? 'No proposals submitted yet' 
                : 'No proposals received yet';
            const emptyDescription = talentSync.currentUser.role === 'freelancer'
                ? 'Start applying to jobs to see your proposals here'
                : 'Proposals from freelancers will appear here when they apply to your jobs';
                
            proposalsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-paper-plane"></i>
                    <h3>${emptyMessage}</h3>
                    <p>${emptyDescription}</p>
                </div>
            `;
            return;
        }

        if (talentSync.currentUser.role === 'freelancer') {
            // Freelancer view - show proposals they've sent
            proposalsList.innerHTML = proposals.map(proposal => `
                <div class="proposal-card">
                    <div class="proposal-header">
                        <div>
                            <h3>${proposal.jobTitle || 'Job Title'}</h3>
                            <p>Client: ${proposal.clientName || 'Unknown Client'}</p>
                            <small>Submitted: ${new Date(proposal.submittedDate).toLocaleDateString()}</small>
                        </div>
                        <span class="proposal-status ${proposal.status}">${proposal.status}</span>
                    </div>
                    <div class="proposal-content">
                        <p>${proposal.coverLetter}</p>
                        <div class="proposal-details">
                            <strong>Bid Amount: $${proposal.bidAmount}</strong>
                            <span>Delivery: ${proposal.deliveryTime}</span>
                        </div>
                    </div>
                    <div class="proposal-actions">
                        <button class="btn btn-outline btn-sm" onclick="dashboard.viewProposal('${proposal.id}')">View Details</button>
                        ${proposal.status === 'pending' ? 
                            `<button class="btn btn-primary btn-sm" onclick="dashboard.editProposal('${proposal.id}')">Edit</button>` : 
                            ''
                        }
                    </div>
                </div>
            `).join('');
        } else {
            // Client view - show proposals they've received
            proposalsList.innerHTML = proposals.map(proposal => `
                <div class="proposal-card">
                    <div class="proposal-header">
                        <div class="freelancer-info">
                            <img src="${proposal.freelancerAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face'}" 
                                 alt="${proposal.freelancerName}" class="freelancer-avatar">
                            <div>
                                <h3>${proposal.freelancerName || 'Freelancer'}</h3>
                                <p>For: ${proposal.jobTitle || 'Job Title'}</p>
                                <div class="freelancer-stats">
                                    <span><i class="fas fa-star"></i> ${proposal.freelancerRating || 0}</span>
                                    <span><i class="fas fa-check-circle"></i> ${proposal.freelancerCompletedJobs || 0} jobs</span>
                                </div>
                            </div>
                        </div>
                        <div class="proposal-meta">
                            <span class="proposal-status ${proposal.status}">${proposal.status}</span>
                            <div class="proposal-bid">$${proposal.bidAmount}</div>
                            <small>Submitted: ${new Date(proposal.submittedDate).toLocaleDateString()}</small>
                        </div>
                    </div>
                    <div class="proposal-content">
                        <div class="cover-letter">
                            <h4>Cover Letter</h4>
                            <p>${proposal.coverLetter}</p>
                        </div>
                        <div class="proposal-details">
                            <div class="detail-item">
                                <strong>Delivery Time:</strong> ${proposal.deliveryTime}
                            </div>
                            ${proposal.questions ? `
                                <div class="detail-item">
                                    <strong>Questions:</strong> ${proposal.questions}
                                </div>
                            ` : ''}
                            ${proposal.freelancerSkills && proposal.freelancerSkills.length > 0 ? `
                                <div class="detail-item">
                                    <strong>Skills:</strong>
                                    <div class="skills-list">
                                        ${proposal.freelancerSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="proposal-actions">
                        <button class="btn btn-outline btn-sm" onclick="dashboard.viewFreelancerProfile('${proposal.freelancerId}')">View Profile</button>
                        <button class="btn btn-outline btn-sm" onclick="dashboard.messageFreelancer('${proposal.freelancerId}')">Message</button>
                        ${proposal.status === 'pending' ? `
                            <button class="btn btn-success btn-sm" onclick="dashboard.acceptProposal('${proposal.id}')">Accept</button>
                            <button class="btn btn-danger btn-sm" onclick="dashboard.rejectProposal('${proposal.id}')">Reject</button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
    }

    loadEarnings() {
        // Update earnings summary
        const totalEarnings = talentSync.currentUser.profile.totalEarnings || 0;
        const monthEarnings = talentSync.currentUser.profile.monthEarnings || 0;
        const pendingEarnings = talentSync.currentUser.profile.pendingEarnings || 0;

        document.getElementById('total-earnings').textContent = '$' + totalEarnings;
        document.getElementById('month-earnings').textContent = '$' + monthEarnings;
        document.getElementById('pending-earnings').textContent = '$' + pendingEarnings;

        // Load transactions
        this.loadTransactions();
    }

    loadTransactions() {
        const transactionsList = document.getElementById('transactions-list');
        
        // Sample transactions
        const transactions = [
            {
                id: 1,
                description: 'E-commerce Website Project',
                client: 'TechStart Inc.',
                amount: '$2,500',
                date: '2024-01-20',
                status: 'completed'
            },
            {
                id: 2,
                description: 'Mobile App UI Design',
                client: 'StartupXYZ',
                amount: '$1,200',
                date: '2024-01-18',
                status: 'completed'
            },
            {
                id: 3,
                description: 'Logo Design Project',
                client: 'Creative Agency',
                amount: '$500',
                date: '2024-01-15',
                status: 'pending'
            }
        ];

        transactionsList.innerHTML = transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <h4>${transaction.description}</h4>
                    <p>${transaction.client} • ${transaction.date}</p>
                </div>
                <div class="transaction-amount">${transaction.amount}</div>
            </div>
        `).join('');
    }

    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'dashboard-overview':
                this.loadStats();
                this.loadQuickActions();
                this.loadRecentActivity();
                break;
            case 'jobs-section':
                this.loadJobs();
                break;
            case 'proposals-section':
                this.loadProposals();
                break;
            case 'earnings-section':
                this.loadEarnings();
                break;
        }
    }

    setupEventListeners() {
        // Filter listeners
        const jobsFilter = document.getElementById('jobs-filter');
        if (jobsFilter) {
            jobsFilter.addEventListener('change', (e) => {
                this.filterJobs(e.target.value);
            });
        }

        const proposalsFilter = document.getElementById('proposals-filter');
        if (proposalsFilter) {
            proposalsFilter.addEventListener('change', (e) => {
                this.filterProposals(e.target.value);
            });
        }

        const earningsFilter = document.getElementById('earnings-period');
        if (earningsFilter) {
            earningsFilter.addEventListener('change', (e) => {
                this.filterEarnings(e.target.value);
            });
        }

        // Mobile sidebar toggle
        this.setupMobileSidebar();
    }

    setupMobileSidebar() {
        const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
        const sidebar = document.getElementById('dashboard-sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        // Show/hide mobile toggle button based on screen size
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                if (mobileSidebarToggle) mobileSidebarToggle.style.display = 'flex';
            } else {
                if (mobileSidebarToggle) mobileSidebarToggle.style.display = 'none';
                if (sidebar) sidebar.classList.remove('open');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            }
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        
        // Toggle sidebar on button click
        if (mobileSidebarToggle) {
            mobileSidebarToggle.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }
        
        // Close sidebar when clicking overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }
        
        // Close sidebar when clicking a menu item
        if (sidebar) {
            sidebar.querySelectorAll('.sidebar-nav a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        this.closeMobileSidebar();
                    }
                });
            });
        }
    }
    
    toggleMobileSidebar() {
        const sidebar = document.getElementById('dashboard-sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.toggle('active');
        }
    }
    
    closeMobileSidebar() {
        const sidebar = document.getElementById('dashboard-sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
    }

    // Utility functions
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

    getStatusColor(status) {
        const statusColors = {
            'Active': 'primary',
            'In Progress': 'primary',
            'Completed': 'success',
            'Review': 'warning',
            'In Review': 'warning',
            'pending': 'warning',
            'accepted': 'success',
            'rejected': 'error'
        };
        return statusColors[status] || 'primary';
    }

    // Action handlers
    browseJobs() {
        window.location.href = 'browse-jobs.html';
    }

    postJob() {
        window.location.href = 'post-job.html';
    }

    browseTalent() {
        window.location.href = 'freelancers.html';
    }

    openMessages() {
        window.location.href = 'messages.html';
    }

    editProfile() {
        talentSync.showToast('Profile editing feature coming soon!', 'info');
    }

    submitProposal() {
        talentSync.showToast('Proposal submission feature coming soon!', 'info');
    }

    viewProposals() {
        this.showSection('proposals-section');
    }

    viewJob(jobId) {
        talentSync.showToast(`Viewing job #${jobId}`, 'info');
    }

    updateJob(jobId) {
        talentSync.showToast(`Updating job #${jobId}`, 'info');
    }

    async manageJob(jobId) {
        console.log('Dashboard: manageJob called with jobId:', jobId);
        
        // Ensure jobId is a string (Firestore doc IDs are strings)
        const currentId = String(jobId);
        
        // Enhanced validation and error handling
        if (!currentId || currentId === 'undefined' || currentId === 'null') {
            console.error('Dashboard: Invalid job ID provided:', jobId);
            if (typeof talentSync !== 'undefined' && talentSync.showToast) {
                talentSync.showToast('Invalid job ID provided', 'error');
            } else {
                alert('Invalid job ID provided');
            }
            return;
        }
        
        // Check if Firebase is available
        if (!firebaseService || !firebaseService.db) {
            console.error('Dashboard: Firebase service not available');
            if (typeof talentSync !== 'undefined' && talentSync.showToast) {
                talentSync.showToast('Unable to load job details. Firebase not available.', 'error');
            } else {
                alert('Firebase service not available');
            }
            return;
        }

        // Check if talentSync is available
        if (typeof talentSync === 'undefined') {
            console.error('Dashboard: talentSync not available');
            alert('TalentSync service not available');
            return;
        }

        // Check if user is authenticated
        if (!talentSync.currentUser) {
            console.error('Dashboard: No authenticated user');
            if (talentSync.showToast) {
                talentSync.showToast('Please log in to manage jobs', 'error');
            } else {
                alert('Please log in to manage jobs');
            }
            return;
        }

        // Show loading with fallback
        if (talentSync.showLoading) {
            talentSync.showLoading();
        } else {
            console.log('Loading job details...');
        }

        try {
            // Load the job document from Firestore
            console.log('Loading job document:', currentId);
            const doc = await firebaseService.db.collection('jobs').doc(currentId).get();
            
            // Hide loading
            if (talentSync.hideLoading) {
                talentSync.hideLoading();
            }
            
            if (!doc.exists) {
                console.error('Dashboard: Job not found in Firestore:', currentId);
                if (talentSync.showToast) {
                    talentSync.showToast('Job not found', 'error');
                } else {
                    alert('Job not found');
                }
                return;
            }

            const job = doc.data();
            console.log('Dashboard: Loaded job data:', job);
            
            // Verify that the current user owns this job
            const currentUserId = talentSync.currentUser.id || talentSync.currentUser.uid;
            if (job.clientId !== currentUserId) {
                console.error('Dashboard: User does not own this job. Job clientId:', job.clientId, 'User ID:', currentUserId);
                if (talentSync.showToast) {
                    talentSync.showToast('You can only manage your own jobs', 'error');
                } else {
                    alert('You can only manage your own jobs');
                }
                return;
            }
            
            // Create the job management modal
            this.showJobManagementModal(currentId, job);
            
        } catch (err) {
            // Hide loading on error
            if (talentSync.hideLoading) {
                talentSync.hideLoading();
            }
            
            console.error('Dashboard: failed to load job for manage modal', err);
            
            // Enhanced error handling
            let errorMessage = 'Failed to load job details: ' + err.message;
            if (err.code === 'permission-denied') {
                errorMessage = 'You do not have permission to access this job.';
            } else if (err.code === 'not-found') {
                errorMessage = 'Job not found. It may have been deleted.';
            } else if (err.code === 'unavailable') {
                errorMessage = 'Service temporarily unavailable. Please try again.';
            }
            
            if (talentSync.showToast) {
                talentSync.showToast(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }
        }
    }

    showJobManagementModal(jobId, job) {
        console.log('Showing job management modal for:', jobId);
        
        // Validate inputs
        if (!jobId || !job) {
            console.error('Invalid parameters for showJobManagementModal:', { jobId, job });
            if (talentSync && talentSync.showToast) {
                talentSync.showToast('Invalid job data for modal', 'error');
            }
            return;
        }
        
        // Check if modal system is available
        if (!talentSync || typeof talentSync.showModal !== 'function') {
            console.error('Modal system not available');
            alert('Modal system not available. Please refresh the page.');
            return;
        }
        
        // Escape HTML to prevent XSS
        const escapeHtml = (text) => {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        };

        // Safely extract job data with defaults
        const budgetType = job.budgetType || job.budget?.type || 'fixed';
        const budgetMin = job.budgetMin || job.budget?.min || '';
        const budgetMax = job.budgetMax || job.budget?.max || '';
        const hourlyMin = job.hourlyMin || '';
        const hourlyMax = job.hourlyMax || '';
        const skillsArray = Array.isArray(job.skills) ? job.skills : [];
        const skillsString = skillsArray.join(', ');

        const modalHTML = `
            <div class="modal manage-job-modal">
                <div class="modal-header">
                    <h2 class="modal-title">Manage Job: ${escapeHtml(job.title || 'Untitled Job')}</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="manage-job-form" onsubmit="event.preventDefault(); dashboard.handleJobUpdate(event, '${escapeHtml(jobId)}')">
                        <div class="form-group">
                            <label class="form-label">Job Title *</label>
                            <input type="text" class="form-input" name="title" value="${escapeHtml(job.title || '')}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select name="status" class="form-input" required>
                                <option value="active" ${job.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="in-review" ${job.status === 'in-review' ? 'selected' : ''}>In Review</option>
                                <option value="completed" ${job.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="cancelled" ${job.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select name="category" class="form-input">
                                <option value="web-development" ${job.category === 'web-development' ? 'selected' : ''}>Web Development</option>
                                <option value="mobile-development" ${job.category === 'mobile-development' ? 'selected' : ''}>Mobile Development</option>
                                <option value="design" ${job.category === 'design' ? 'selected' : ''}>Design & Creative</option>
                                <option value="writing" ${job.category === 'writing' ? 'selected' : ''}>Writing & Content</option>
                                <option value="marketing" ${job.category === 'marketing' ? 'selected' : ''}>Digital Marketing</option>
                                <option value="data-science" ${job.category === 'data-science' ? 'selected' : ''}>Data Science</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Budget Type</label>
                            <select name="budgetType" class="form-input" id="manage-budget-type" onchange="dashboard.toggleBudgetFields()">
                                <option value="fixed" ${budgetType === 'fixed' ? 'selected' : ''}>Fixed Price</option>
                                <option value="hourly" ${budgetType === 'hourly' ? 'selected' : ''}>Hourly Rate</option>
                            </select>
                        </div>
                        
                        <div id="fixed-budget-fields" style="display: ${budgetType === 'fixed' ? 'block' : 'none'};">
                            <div class="form-group">
                                <label class="form-label">Minimum Budget ($)</label>
                                <input type="number" class="form-input" name="budgetMin" value="${budgetMin}" min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Maximum Budget ($)</label>
                                <input type="number" class="form-input" name="budgetMax" value="${budgetMax}" min="0">
                            </div>
                        </div>
                        
                        <div id="hourly-budget-fields" style="display: ${budgetType === 'hourly' ? 'block' : 'none'};">
                            <div class="form-group">
                                <label class="form-label">Minimum Rate ($/hr)</label>
                                <input type="number" class="form-input" name="hourlyMin" value="${hourlyMin}" min="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Maximum Rate ($/hr)</label>
                                <input type="number" class="form-input" name="hourlyMax" value="${hourlyMax}" min="0">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Experience Level</label>
                            <select name="experience" class="form-input">
                                <option value="entry" ${job.experience === 'entry' ? 'selected' : ''}>Entry Level</option>
                                <option value="intermediate" ${job.experience === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                                <option value="expert" ${job.experience === 'expert' ? 'selected' : ''}>Expert</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Project Duration</label>
                            <select name="duration" class="form-input">
                                <option value="short" ${job.duration === 'short' ? 'selected' : ''}>Less than 1 month</option>
                                <option value="medium" ${job.duration === 'medium' ? 'selected' : ''}>1-3 months</option>
                                <option value="long" ${job.duration === 'long' ? 'selected' : ''}>3+ months</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Required Skills (comma-separated)</label>
                            <input type="text" class="form-input" name="skills" value="${escapeHtml(skillsString)}" 
                                   placeholder="e.g., JavaScript, React, Node.js">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Job Description *</label>
                            <textarea class="form-input" name="description" rows="4" required>${escapeHtml(job.description || '')}</textarea>
                        </div>
                        
                        <div class="job-stats" style="background: #f8f9fa; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                            <div><strong>Proposals Received:</strong> ${job.proposals || 0}</div>
                            <div><strong>Posted Date:</strong> ${job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Unknown'}</div>
                        </div>
                        
                        <div class="form-actions" style="display: flex; justify-content: space-between; gap: 1rem; margin-top: 2rem;">
                            <button type="button" class="btn btn-danger" onclick="dashboard.deleteJob('${escapeHtml(jobId)}')">
                                <i class="fas fa-trash"></i> Delete Job
                            </button>
                            <div style="display: flex; gap: 1rem;">
                                <button type="button" class="btn btn-outline" onclick="talentSync.closeModal()">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Save Changes
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;

        try {
            talentSync.showModal(modalHTML);
            console.log('Job management modal displayed successfully');
        } catch (error) {
            console.error('Error showing job management modal:', error);
            alert('Error displaying job management modal: ' + error.message);
        }
    }

    toggleBudgetFields() {
        const budgetType = document.getElementById('manage-budget-type').value;
        const fixedFields = document.getElementById('fixed-budget-fields');
        const hourlyFields = document.getElementById('hourly-budget-fields');
        
        if (fixedFields && hourlyFields) {
            if (budgetType === 'fixed') {
                fixedFields.style.display = 'block';
                hourlyFields.style.display = 'none';
            } else {
                fixedFields.style.display = 'none';
                hourlyFields.style.display = 'block';
            }
        }
    }

    viewProposal(proposalId) {
        console.log(`Viewing proposal: ${proposalId}`);
        talentSync.showToast(`Viewing proposal details`, 'info');
    }

    editProposal(proposalId) {
        console.log(`Editing proposal: ${proposalId}`);
        talentSync.showToast(`Proposal editing feature coming soon!`, 'info');
    }

    viewFreelancerProfile(freelancerId) {
        console.log(`Viewing freelancer profile: ${freelancerId}`);
        // Redirect to freelancer profile or show modal
        window.location.href = `freelancers.html?id=${freelancerId}`;
    }

    messageFreelancer(freelancerId) {
        console.log(`Messaging freelancer: ${freelancerId}`);
        // Redirect to messages with freelancer
        window.location.href = `messages.html?user=${freelancerId}`;
    }

    async acceptProposal(proposalId) {
        console.log(`Accepting proposal: ${proposalId}`);
        
        try {
            if (firebaseService && firebaseService.db) {
                await firebaseService.db.collection('proposals').doc(proposalId).update({
                    status: 'accepted',
                    acceptedDate: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                talentSync.showToast('Proposal accepted successfully!', 'success');
                this.loadProposals(); // Refresh the proposals list
            } else {
                // Fallback to localStorage
                const proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
                const proposalIndex = proposals.findIndex(p => p.id === proposalId);
                if (proposalIndex !== -1) {
                    proposals[proposalIndex].status = 'accepted';
                    proposals[proposalIndex].acceptedDate = new Date().toISOString();
                    localStorage.setItem('proposals', JSON.stringify(proposals));
                    
                    talentSync.showToast('Proposal accepted successfully!', 'success');
                    this.loadProposals(); // Refresh the proposals list
                }
            }
        } catch (error) {
            console.error('Error accepting proposal:', error);
            talentSync.showToast('Failed to accept proposal. Please try again.', 'error');
        }
    }

    async rejectProposal(proposalId) {
        console.log(`Rejecting proposal: ${proposalId}`);
        
        try {
            if (firebaseService && firebaseService.db) {
                await firebaseService.db.collection('proposals').doc(proposalId).update({
                    status: 'rejected',
                    rejectedDate: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                talentSync.showToast('Proposal rejected', 'info');
                this.loadProposals(); // Refresh the proposals list
            } else {
                // Fallback to localStorage
                const proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
                const proposalIndex = proposals.findIndex(p => p.id === proposalId);
                if (proposalIndex !== -1) {
                    proposals[proposalIndex].status = 'rejected';
                    proposals[proposalIndex].rejectedDate = new Date().toISOString();
                    localStorage.setItem('proposals', JSON.stringify(proposals));
                    
                    talentSync.showToast('Proposal rejected', 'info');
                    this.loadProposals(); // Refresh the proposals list
                }
            }
        } catch (error) {
            console.error('Error rejecting proposal:', error);
            talentSync.showToast('Failed to reject proposal. Please try again.', 'error');
        }
    }

    async handleJobUpdate(event, jobId) {
        event.preventDefault();
        console.log('Dashboard: handleJobUpdate called with jobId:', jobId);

        const formData = new FormData(event.target);
        const budgetType = formData.get('budgetType');
        
        // Validate required fields
        const title = formData.get('title')?.trim();
        const description = formData.get('description')?.trim();
        
        if (!title || !description) {
            if (talentSync && talentSync.showToast) {
                talentSync.showToast('Title and description are required', 'error');
            } else {
                alert('Title and description are required');
            }
            return;
        }
        
        const updates = {
            title: title,
            status: formData.get('status'),
            budgetType: budgetType,
            description: description,
            category: formData.get('category'),
            experience: formData.get('experience'),
            duration: formData.get('duration')
        };

        // Handle skills - convert comma-separated string to array
        const skillsString = formData.get('skills')?.trim();
        if (skillsString) {
            updates.skills = skillsString.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
        }

        // Handle budget fields based on type
        if (budgetType === 'fixed') {
            const budgetMin = formData.get('budgetMin');
            const budgetMax = formData.get('budgetMax');
            if (budgetMin) updates.budgetMin = Number(budgetMin);
            if (budgetMax) updates.budgetMax = Number(budgetMax);
            
            // Validate budget range
            if (updates.budgetMin && updates.budgetMax && updates.budgetMin > updates.budgetMax) {
                if (talentSync && talentSync.showToast) {
                    talentSync.showToast('Minimum budget cannot be greater than maximum budget', 'error');
                } else {
                    alert('Minimum budget cannot be greater than maximum budget');
                }
                return;
            }
        } else {
            const hourlyMin = formData.get('hourlyMin');
            const hourlyMax = formData.get('hourlyMax');
            if (hourlyMin) updates.hourlyMin = Number(hourlyMin);
            if (hourlyMax) updates.hourlyMax = Number(hourlyMax);
            
            // Validate hourly range
            if (updates.hourlyMin && updates.hourlyMax && updates.hourlyMin > updates.hourlyMax) {
                if (talentSync && talentSync.showToast) {
                    talentSync.showToast('Minimum hourly rate cannot be greater than maximum hourly rate', 'error');
                } else {
                    alert('Minimum hourly rate cannot be greater than maximum hourly rate');
                }
                return;
            }
        }

        // Remove empty values
        Object.keys(updates).forEach(key => {
            if (updates[key] === '' || updates[key] === null || updates[key] === undefined) {
                delete updates[key];
            }
        });

        console.log('Dashboard: Updating job with:', updates);

        if (talentSync && talentSync.showLoading) {
            talentSync.showLoading();
        }

        try {
            if (firebaseService && firebaseService.updateJob) {
                const result = await firebaseService.updateJob(String(jobId), updates);
                
                if (talentSync && talentSync.hideLoading) {
                    talentSync.hideLoading();
                }
                
                if (result.success) {
                    if (talentSync && talentSync.showToast) {
                        talentSync.showToast('Job updated successfully!', 'success');
                    } else {
                        alert('Job updated successfully!');
                    }
                    
                    if (talentSync && talentSync.closeModal) {
                        talentSync.closeModal();
                    }
                    
                    // Reload jobs to show updated data
                    await this.loadClientJobs();
                    
                    // Also refresh the stats if we're on the overview
                    if (this.currentSection === 'dashboard-overview') {
                        await this.loadStats();
                    }
                } else {
                    if (talentSync && talentSync.showToast) {
                        talentSync.showToast('Failed to update job: ' + (result.error || 'Unknown error'), 'error');
                    } else {
                        alert('Failed to update job: ' + (result.error || 'Unknown error'));
                    }
                }
            } else {
                // LocalStorage fallback
                const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
                const idx = jobs.findIndex(j => String(j.id) === String(jobId));
                if (idx !== -1) {
                    // Update the job with new data
                    jobs[idx] = { 
                        ...jobs[idx], 
                        ...updates,
                        updatedAt: new Date().toISOString()
                    };
                    localStorage.setItem('jobs', JSON.stringify(jobs));
                    
                    if (talentSync && talentSync.hideLoading) {
                        talentSync.hideLoading();
                    }
                    
                    if (talentSync && talentSync.showToast) {
                        talentSync.showToast('Job updated successfully!', 'success');
                    } else {
                        alert('Job updated successfully!');
                    }
                    
                    if (talentSync && talentSync.closeModal) {
                        talentSync.closeModal();
                    }
                    
                    await this.loadClientJobs();
                } else {
                    if (talentSync && talentSync.hideLoading) {
                        talentSync.hideLoading();
                    }
                    
                    if (talentSync && talentSync.showToast) {
                        talentSync.showToast('Job not found in local storage', 'error');
                    } else {
                        alert('Job not found in local storage');
                    }
                }
            }
        } catch (error) {
            console.error('Dashboard: Error updating job:', error);
            
            if (talentSync && talentSync.hideLoading) {
                talentSync.hideLoading();
            }
            
            if (talentSync && talentSync.showToast) {
                talentSync.showToast('Error updating job: ' + error.message, 'error');
            } else {
                alert('Error updating job: ' + error.message);
            }
        }
    }

    async deleteJob(jobId) {
        console.log('Dashboard: deleteJob called with jobId:', jobId);
        
        // Enhanced confirmation dialog
        const confirmDelete = confirm(
            'Are you sure you want to delete this job?\n\n' +
            'This will permanently remove the job and all associated proposals.\n' +
            'This action cannot be undone.\n\n' +
            'Click OK to confirm deletion.'
        );
        
        if (!confirmDelete) {
            return;
        }

        if (talentSync && talentSync.showLoading) {
            talentSync.showLoading();
        }

        try {
            const jobIdStr = String(jobId);
            
            if (firebaseService && firebaseService.deleteJob) {
                const result = await firebaseService.deleteJob(jobIdStr);
                
                if (talentSync && talentSync.hideLoading) {
                    talentSync.hideLoading();
                }
                
                if (result.success) {
                    if (talentSync && talentSync.showToast) {
                        talentSync.showToast('Job deleted successfully!', 'success');
                    } else {
                        alert('Job deleted successfully!');
                    }
                    
                    if (talentSync && talentSync.closeModal) {
                        talentSync.closeModal();
                    }
                    
                    // Reload jobs to show updated list
                    await this.loadClientJobs();
                    
                    // Also refresh the stats if we're on the overview
                    if (this.currentSection === 'dashboard-overview') {
                        await this.loadStats();
                    }
                } else {
                    if (talentSync && talentSync.showToast) {
                        talentSync.showToast('Failed to delete job: ' + (result.error || 'Unknown error'), 'error');
                    } else {
                        alert('Failed to delete job: ' + (result.error || 'Unknown error'));
                    }
                }
            } else {
                // LocalStorage fallback
                console.log('Using localStorage fallback for job deletion');
                
                // Delete job from jobs array
                let jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
                jobs = jobs.filter(j => String(j.id) !== jobIdStr);
                localStorage.setItem('jobs', JSON.stringify(jobs));
                
                // Delete associated proposals
                let proposals = JSON.parse(localStorage.getItem('proposals') || '[]');
                proposals = proposals.filter(p => String(p.jobId) !== jobIdStr);
                localStorage.setItem('proposals', JSON.stringify(proposals));
                
                if (talentSync && talentSync.hideLoading) {
                    talentSync.hideLoading();
                }
                
                if (talentSync && talentSync.showToast) {
                    talentSync.showToast('Job deleted successfully!', 'success');
                } else {
                    alert('Job deleted successfully!');
                }
                
                if (talentSync && talentSync.closeModal) {
                    talentSync.closeModal();
                }
                
                await this.loadClientJobs();
            }
        } catch (error) {
            console.error('Dashboard: Error deleting job:', error);
            
            if (talentSync && talentSync.hideLoading) {
                talentSync.hideLoading();
            }
            
            let errorMessage = 'Error deleting job: ' + error.message;
            if (error.code === 'permission-denied') {
                errorMessage = 'You do not have permission to delete this job.';
            } else if (error.code === 'not-found') {
                errorMessage = 'Job not found. It may have already been deleted.';
            }
            
            if (talentSync && talentSync.showToast) {
                talentSync.showToast(errorMessage, 'error');
            } else {
                alert(errorMessage);
            }
        }
    }

    showNotifications() {
        talentSync.showToast('Notifications feature coming soon!', 'info');
    }

    uploadAvatar() {
        talentSync.showToast('Avatar upload feature coming soon!', 'info');
    }

    changePassword() {
        talentSync.showToast('Change password feature coming soon!', 'info');
    }

    enableTwoFactor() {
        talentSync.showToast('Two-factor authentication feature coming soon!', 'info');
    }

    deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            talentSync.showToast('Account deletion feature coming soon!', 'info');
        }
    }

    filterJobs(filter) {
        talentSync.showToast(`Filtering jobs by: ${filter}`, 'info');
    }

    filterProposals(filter) {
        talentSync.showToast(`Filtering proposals by: ${filter}`, 'info');
    }

    filterEarnings(period) {
        talentSync.showToast(`Showing earnings for: ${period}`, 'info');
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

// Initialize dashboard when page loads
const dashboard = new Dashboard();

// Make it globally available
window.dashboard = dashboard;
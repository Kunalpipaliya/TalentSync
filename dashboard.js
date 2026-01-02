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
                { id: 'proposals-section', icon: 'fas fa-paper-plane', text: 'Proposals' },
                { id: 'earnings-section', icon: 'fas fa-dollar-sign', text: 'Earnings' },
                { id: 'settings-section', icon: 'fas fa-cog', text: 'Settings' }
            ];
        } else {
            menuItems = [
                { id: 'dashboard-overview', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
                { id: 'profile-section', icon: 'fas fa-user', text: 'My Profile' },
                { id: 'jobs-section', icon: 'fas fa-briefcase', text: 'Posted Jobs' },
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
                jobs = jobs.filter(j => j.clientId === talentSync.currentUser.id);
            }
            
            const hireRequests = JSON.parse(localStorage.getItem('hireRequests') || '[]');
            const userHires = hireRequests.filter(h => h.clientId === talentSync.currentUser.id);
            
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
                    value: userJobs.length,
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
                        <button class="btn btn-outline btn-sm" onclick="dashboard.viewJob(${job.id})">View</button>
                        <button class="btn btn-primary btn-sm" onclick="dashboard.updateJob(${job.id})">Update</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadClientJobs() {
        const jobsGrid = document.getElementById('jobs-grid');
        
        let jobs = [];
        if (talentSync.useFirebase && firebaseService) {
            // Load jobs from Firebase
            const result = await firebaseService.loadJobs({ 
                clientId: talentSync.currentUser.id || talentSync.currentUser.uid 
            });
            if (result.success) {
                jobs = result.data.map(job => ({
                    id: job.id,
                    title: job.title,
                    proposals: job.proposals || 0,
                    status: job.status || 'Active',
                    budget: job.budgetType === 'fixed' ? `$${job.budgetMin}-$${job.budgetMax}` : `$${job.hourlyMin}-$${job.hourlyMax}/hr`,
                    posted: job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Unknown',
                    hired: job.hiredFreelancer || null
                }));
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
                        <button class="btn btn-outline btn-sm" onclick="dashboard.viewJob(${job.id})">View</button>
                        <button class="btn btn-primary btn-sm" onclick="dashboard.manageJob(${job.id})">Manage</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadProposals() {
        if (talentSync.currentUser.role !== 'freelancer') return;

        const proposalsList = document.getElementById('proposals-list');
        
        let proposals = [];
        if (talentSync.useFirebase && firebaseService) {
            // Load proposals from Firebase
            const result = await firebaseService.loadProposals({ 
                freelancerId: talentSync.currentUser.id || talentSync.currentUser.uid 
            });
            if (result.success) {
                proposals = result.data;
            }
        } else {
            // Fallback to sample data
            proposals = [
                {
                    id: 1,
                    jobTitle: 'Full Stack Developer for SaaS Platform',
                    client: 'TechCorp',
                    bidAmount: '$4,500',
                    status: 'pending',
                    submittedDate: '2024-01-15',
                    coverLetter: 'I have extensive experience in full-stack development...'
                },
                {
                    id: 2,
                    jobTitle: 'UI/UX Designer for Mobile App',
                    client: 'StartupABC',
                    bidAmount: '$2,200',
                    status: 'accepted',
                    submittedDate: '2024-01-12',
                    coverLetter: 'I specialize in mobile app design with a focus on user experience...'
                },
                {
                    id: 3,
                    jobTitle: 'WordPress Developer',
                    client: 'Digital Agency',
                    bidAmount: '$1,800',
                    status: 'rejected',
                    submittedDate: '2024-01-10',
                    coverLetter: 'I can help you build a custom WordPress solution...'
                }
            ];
        }

        proposalsList.innerHTML = proposals.map(proposal => `
            <div class="proposal-card">
                <div class="proposal-header">
                    <div>
                        <h3>${proposal.jobTitle}</h3>
                        <p>Client: ${proposal.client}</p>
                        <small>Submitted: ${proposal.submittedDate}</small>
                    </div>
                    <span class="proposal-status ${proposal.status}">${proposal.status}</span>
                </div>
                <div class="proposal-content">
                    <p>${proposal.coverLetter}</p>
                    <div style="margin-top: 1rem;">
                        <strong>Bid Amount: ${proposal.bidAmount}</strong>
                    </div>
                </div>
                <div class="proposal-actions">
                    <button class="btn btn-outline btn-sm" onclick="dashboard.viewProposal(${proposal.id})">View Details</button>
                    ${proposal.status === 'pending' ? 
                        `<button class="btn btn-primary btn-sm" onclick="dashboard.editProposal(${proposal.id})">Edit</button>` : 
                        ''
                    }
                </div>
            </div>
        `).join('');
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
        // Add mobile menu toggle button to dashboard header if it doesn't exist
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader && window.innerWidth <= 768) {
            const existingToggle = sectionHeader.querySelector('.mobile-sidebar-toggle');
            if (!existingToggle) {
                const toggleButton = document.createElement('button');
                toggleButton.className = 'btn btn-outline mobile-sidebar-toggle';
                toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
                toggleButton.onclick = () => this.toggleMobileSidebar();
                
                const headerActions = sectionHeader.querySelector('.header-actions');
                if (headerActions) {
                    headerActions.insertBefore(toggleButton, headerActions.firstChild);
                } else {
                    sectionHeader.appendChild(toggleButton);
                }
            }
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                const sidebar = document.querySelector('.dashboard-sidebar');
                if (sidebar) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    toggleMobileSidebar() {
        const sidebar = document.querySelector('.dashboard-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
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

    manageJob(jobId) {
        talentSync.showToast(`Managing job #${jobId}`, 'info');
    }

    viewProposal(proposalId) {
        talentSync.showToast(`Viewing proposal #${proposalId}`, 'info');
    }

    editProposal(proposalId) {
        talentSync.showToast(`Editing proposal #${proposalId}`, 'info');
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
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
    }
}

// Initialize dashboard when page loads
const dashboard = new Dashboard();

// Make it globally available
window.dashboard = dashboard;

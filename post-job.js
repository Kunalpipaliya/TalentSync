// Post Job JavaScript
class JobPoster {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.selectedSkills = [];
        this.uploadedFiles = [];
        this.jobData = {};
        
        this.skillsSuggestions = [
            'JavaScript', 'React', 'Node.js', 'Python', 'PHP', 'Vue.js', 'Angular', 'TypeScript',
            'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind CSS', 'jQuery', 'Express.js', 'Django',
            'Flask', 'Laravel', 'WordPress', 'Shopify', 'WooCommerce', 'MySQL', 'PostgreSQL', 'MongoDB',
            'Firebase', 'AWS', 'Docker', 'Git', 'REST API', 'GraphQL', 'Redux', 'Webpack',
            'Photoshop', 'Illustrator', 'Figma', 'Sketch', 'Adobe XD', 'InDesign', 'After Effects',
            'Premiere Pro', 'Final Cut Pro', 'Blender', 'Cinema 4D', 'Unity', 'Unreal Engine',
            'iOS', 'Android', 'React Native', 'Flutter', 'Kotlin', 'Swift', 'Xamarin', 'Ionic',
            'Content Writing', 'Copywriting', 'Technical Writing', 'SEO Writing', 'Blogging',
            'Proofreading', 'Translation', 'Creative Writing', 'Grant Writing', 'Resume Writing',
            'SEO', 'Google Ads', 'Facebook Ads', 'Social Media Marketing', 'Email Marketing',
            'Content Marketing', 'Influencer Marketing', 'Analytics', 'PPC', 'Lead Generation',
            'Data Analysis', 'Machine Learning', 'Data Science', 'Python', 'R', 'SQL', 'Tableau',
            'Power BI', 'Excel', 'Statistics', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy'
        ];
        
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
        console.log('PostJob: Waiting for user authentication...');
        
        // Also listen for the userLoaded event
        const userLoadedPromise = new Promise((resolve) => {
            const handleUserLoaded = (event) => {
                console.log('PostJob: User loaded event received');
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
                console.log('PostJob: User authenticated, checking permissions');
                if (this.checkUserAuth()) {
                    console.log('PostJob: User authorized, initializing post job form');
                    this.setupNavigation();
                    this.setupEventListeners();
                    this.updateStepIndicator();
                    return;
                }
                return; // checkUserAuth will handle redirect if needed
            }
            
            // Check if Firebase is still initializing
            if (firebaseService && firebaseService.auth) {
                const firebaseUser = firebaseService.auth.currentUser;
                if (firebaseUser) {
                    console.log('PostJob: Firebase user found, waiting for profile load...');
                    // Wait for either the user to be loaded or the event to fire
                    const userLoaded = await Promise.race([
                        userLoadedPromise,
                        new Promise(resolve => setTimeout(() => resolve(false), 1000))
                    ]);
                    
                    if (userLoaded || talentSync.currentUser) {
                        console.log('PostJob: User profile loaded, checking permissions');
                        if (this.checkUserAuth()) {
                            console.log('PostJob: User authorized, initializing post job form');
                            this.setupNavigation();
                            this.setupEventListeners();
                            this.updateStepIndicator();
                            return;
                        }
                        return; // checkUserAuth will handle redirect if needed
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // If we get here, no user was found after waiting
        console.log('PostJob: No authenticated user found, redirecting to home');
        this.redirectToLogin();
    }

    redirectToLogin() {
        // Show a message and redirect
        if (typeof talentSync !== 'undefined' && talentSync.showToast) {
            talentSync.showToast('Please log in to post jobs', 'info');
        }
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    checkUserAuth() {
        if (!talentSync.currentUser) {
            console.log('PostJob: No user found in checkUserAuth');
            return false;
        }
        
        // Check if user is a client
        if (talentSync.currentUser.role !== 'client') {
            if (typeof talentSync !== 'undefined' && talentSync.showToast) {
                talentSync.showToast('Only clients can post jobs. Please switch to a client account.', 'error');
            }
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
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

    setupEventListeners() {
        // Budget type change
        document.querySelectorAll('input[name="budgetType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleBudgetType(e.target.value);
            });
        });

        // Skills input
        const skillsInput = document.getElementById('skills-input');
        if (skillsInput) {
            skillsInput.addEventListener('input', (e) => {
                this.handleSkillsInput(e.target.value);
            });
            
            skillsInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSkill(e.target.value.trim());
                    e.target.value = '';
                    this.hideSkillsSuggestions();
                }
            });
        }

        // Rich text editor
        const editorContent = document.getElementById('project-description');
        if (editorContent) {
            editorContent.addEventListener('input', () => {
                this.updateHiddenDescription();
            });
        }

        // File upload
        const projectFiles = document.getElementById('project-files');
        if (projectFiles) {
            projectFiles.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }

        // Form validation on input change
        document.querySelectorAll('.form-input').forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    toggleBudgetType(type) {
        const fixedGroup = document.getElementById('fixed-budget-group');
        const hourlyGroup = document.getElementById('hourly-budget-group');
        
        if (type === 'fixed') {
            fixedGroup.style.display = 'block';
            hourlyGroup.style.display = 'none';
            // Clear hourly inputs
            document.querySelector('input[name="hourlyMin"]').value = '';
            document.querySelector('input[name="hourlyMax"]').value = '';
        } else {
            fixedGroup.style.display = 'none';
            hourlyGroup.style.display = 'block';
            // Clear fixed inputs
            document.querySelector('input[name="budgetMin"]').value = '';
            document.querySelector('input[name="budgetMax"]').value = '';
        }
    }

    handleSkillsInput(value) {
        if (!value.trim()) {
            this.hideSkillsSuggestions();
            return;
        }

        const suggestions = this.skillsSuggestions.filter(skill => 
            skill.toLowerCase().includes(value.toLowerCase()) &&
            !this.selectedSkills.includes(skill)
        ).slice(0, 5);

        this.showSkillsSuggestions(suggestions);
    }

    showSkillsSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('skills-suggestions');
        
        if (suggestions.length === 0) {
            this.hideSkillsSuggestions();
            return;
        }

        suggestionsContainer.innerHTML = suggestions.map(skill => `
            <div class="skill-suggestion" onclick="jobPoster.selectSkill('${skill}')">
                ${skill}
            </div>
        `).join('');
        
        suggestionsContainer.classList.add('show');
    }

    hideSkillsSuggestions() {
        const suggestionsContainer = document.getElementById('skills-suggestions');
        suggestionsContainer.classList.remove('show');
    }

    selectSkill(skill) {
        this.addSkill(skill);
        document.getElementById('skills-input').value = '';
        this.hideSkillsSuggestions();
    }

    addSkill(skill) {
        if (!skill || this.selectedSkills.includes(skill)) return;
        
        this.selectedSkills.push(skill);
        this.updateSkillsDisplay();
        this.updateSkillsHidden();
    }

    removeSkill(skill) {
        this.selectedSkills = this.selectedSkills.filter(s => s !== skill);
        this.updateSkillsDisplay();
        this.updateSkillsHidden();
    }

    updateSkillsDisplay() {
        const container = document.getElementById('selected-skills');
        container.innerHTML = this.selectedSkills.map(skill => `
            <div class="skill-tag">
                ${skill}
                <button type="button" class="remove-skill" onclick="jobPoster.removeSkill('${skill}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    updateSkillsHidden() {
        document.getElementById('skills-hidden').value = this.selectedSkills.join(',');
    }

    formatText(command) {
        document.execCommand(command, false, null);
        this.updateHiddenDescription();
        
        // Update button state
        const button = event.target.closest('.editor-btn');
        button.classList.toggle('active');
    }

    updateHiddenDescription() {
        const editorContent = document.getElementById('project-description');
        const hiddenTextarea = document.getElementById('description-hidden');
        hiddenTextarea.value = editorContent.innerHTML;
    }

    handleFileUpload(files) {
        Array.from(files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                talentSync.showToast('File ' + file.name + ' is too large. Maximum size is 10MB.', 'error');
                return;
            }
            
            const fileData = {
                name: file.name,
                size: this.formatFileSize(file.size),
                type: file.type,
                url: URL.createObjectURL(file)
            };
            
            this.uploadedFiles.push(fileData);
        });
        
        this.updateFilesDisplay();
    }

    updateFilesDisplay() {
        const container = document.getElementById('uploaded-files');
        container.innerHTML = this.uploadedFiles.map((file, index) => `
            <div class="uploaded-file">
                <div class="file-icon">
                    <i class="fas fa-${this.getFileIcon(file.type)}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${file.size}</div>
                </div>
                <button type="button" class="remove-file" onclick="jobPoster.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.updateFilesDisplay();
    }

    getFileIcon(type) {
        if (type.startsWith('image/')) return 'image';
        if (type.includes('pdf')) return 'file-pdf';
        if (type.includes('word') || type.includes('document')) return 'file-word';
        if (type.includes('text')) return 'file-alt';
        if (type.includes('zip') || type.includes('archive')) return 'file-archive';
        return 'file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    addQuestion() {
        const container = document.getElementById('questions-container');
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-input';
        questionDiv.innerHTML = `
            <input type="text" class="form-input" name="questions[]" 
                   placeholder="Enter your question...">
            <button type="button" class="remove-question" onclick="jobPoster.removeQuestion(this)">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(questionDiv);
    }

    removeQuestion(button) {
        button.parentElement.remove();
    }

    validateStep(step) {
        const stepElement = document.getElementById(`step-${step}`);
        const requiredFields = stepElement.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        // Additional validations
        if (step === 1) {
            const description = document.getElementById('project-description').textContent;
            if (description.length < 100) {
                this.showFieldError(document.getElementById('project-description'), 'Description must be at least 100 characters');
                isValid = false;
            }
        }
        
        if (step === 2) {
            const budgetType = document.querySelector('input[name="budgetType"]:checked').value;
            if (budgetType === 'fixed') {
                const min = parseFloat(document.querySelector('input[name="budgetMin"]').value);
                const max = parseFloat(document.querySelector('input[name="budgetMax"]').value);
                if (min >= max) {
                    this.showFieldError(document.querySelector('input[name="budgetMax"]'), 'Maximum budget must be greater than minimum');
                    isValid = false;
                }
            } else {
                const min = parseFloat(document.querySelector('input[name="hourlyMin"]').value);
                const max = parseFloat(document.querySelector('input[name="hourlyMax"]').value);
                if (min >= max) {
                    this.showFieldError(document.querySelector('input[name="hourlyMax"]'), 'Maximum rate must be greater than minimum');
                    isValid = false;
                }
            }
        }
        
        if (step === 3) {
            if (this.selectedSkills.length < 3) {
                this.showFieldError(document.getElementById('skills-input'), 'Please add at least 3 skills');
                isValid = false;
            }
        }
        
        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        
        // Clear previous errors
        this.clearFieldError(field);
        
        // Required field validation
        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, 'This field is required');
            isValid = false;
        }
        
        // Email validation
        if (field.type === 'email' && value && !this.isValidEmail(value)) {
            this.showFieldError(field, 'Please enter a valid email address');
            isValid = false;
        }
        
        // Number validation
        if (field.type === 'number' && value) {
            const num = parseFloat(value);
            const min = parseFloat(field.getAttribute('min'));
            const max = parseFloat(field.getAttribute('max'));
            
            if (isNaN(num)) {
                this.showFieldError(field, 'Please enter a valid number');
                isValid = false;
            } else if (min !== null && num < min) {
                this.showFieldError(field, 'Value must be at least ' + min);
                isValid = false;
            } else if (max !== null && num > max) {
                this.showFieldError(field, 'Value must be at most ' + max);
                isValid = false;
            }
        }
        
        return isValid;
    }

    showFieldError(field, message) {
        field.style.borderColor = '#ef4444';
        
        // Remove existing error message
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.color = '#ef4444';
        errorElement.style.fontSize = '0.875rem';
        errorElement.style.marginTop = '0.25rem';
        errorElement.textContent = message;
        
        field.parentElement.appendChild(errorElement);
    }

    clearFieldError(field) {
        field.style.borderColor = '';
        const errorElement = field.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    nextStep() {
        if (!this.validateStep(this.currentStep)) {
            return;
        }
        
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepDisplay();
            this.updateStepIndicator();
            
            if (this.currentStep === 4) {
                this.generateJobPreview();
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.updateStepIndicator();
        }
    }

    updateStepDisplay() {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        document.getElementById(`step-${this.currentStep}`).classList.add('active');
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');
        
        prevBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
        nextBtn.style.display = this.currentStep < this.totalSteps ? 'block' : 'none';
        submitBtn.style.display = this.currentStep === this.totalSteps ? 'block' : 'none';
    }

    updateStepIndicator() {
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            }
        });
    }

    generateJobPreview() {
        const formData = new FormData(document.getElementById('job-posting-form'));
        
        // Collect form data
        const jobData = {
            title: formData.get('title'),
            category: formData.get('category'),
            description: document.getElementById('project-description').innerHTML,
            budgetType: formData.get('budgetType'),
            duration: formData.get('duration'),
            experienceLevel: formData.get('experienceLevel'),
            location: formData.get('location') || 'No preference',
            skills: this.selectedSkills,
            requirements: formData.getAll('requirements'),
            questions: formData.getAll('questions[]').filter(q => q.trim())
        };
        
        if (jobData.budgetType === 'fixed') {
            jobData.budgetMin = formData.get('budgetMin');
            jobData.budgetMax = formData.get('budgetMax');
        } else {
            jobData.hourlyMin = formData.get('hourlyMin');
            jobData.hourlyMax = formData.get('hourlyMax');
        }
        
        this.jobData = jobData;
        
        // Generate preview HTML
        const budgetDisplay = jobData.budgetType === 'fixed' 
            ? '$' + jobData.budgetMin + ' - $' + jobData.budgetMax
            : '$' + jobData.hourlyMin + ' - $' + jobData.hourlyMax + '/hr';
        
        const previewHTML = `
            <div class="preview-header">
                <h3 class="preview-title">${jobData.title}</h3>
                <div class="preview-meta">
                    <span><i class="fas fa-folder"></i> ${this.getCategoryName(jobData.category)}</span>
                    <span><i class="fas fa-clock"></i> ${this.getDurationName(jobData.duration)}</span>
                    <span><i class="fas fa-user"></i> ${this.getExperienceName(jobData.experienceLevel)}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${jobData.location}</span>
                </div>
                <div class="preview-budget">${budgetDisplay}</div>
            </div>
            
            <div class="preview-description">
                ${jobData.description}
            </div>
            
            <div class="preview-skills">
                <h4>Required Skills</h4>
                <div class="skills-list">
                    ${jobData.skills.map(skill => '<span class="skill-tag">' + skill + '</span>').join('')}
                </div>
            </div>
            
            ${jobData.requirements.length > 0 ? `
                <div class="preview-requirements">
                    <h4>Additional Requirements</h4>
                    <ul>
                        ${jobData.requirements.map(req => '<li>' + this.getRequirementName(req) + '</li>').join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${jobData.questions.length > 0 ? `
                <div class="preview-requirements">
                    <h4>Questions for Freelancers</h4>
                    <ul>
                        ${jobData.questions.map(question => '<li>' + question + '</li>').join('')}
                    </ul>
                </div>
            ` : ''}
        `;
        
        document.getElementById('job-preview').innerHTML = previewHTML;
    }

    getCategoryName(category) {
        const categories = {
            'web-development': 'Web Development',
            'mobile-development': 'Mobile Development',
            'design': 'Design & Creative',
            'writing': 'Writing & Content',
            'marketing': 'Digital Marketing',
            'data-science': 'Data Science',
            'video-editing': 'Video & Animation',
            'translation': 'Translation'
        };
        return categories[category] || category;
    }

    getDurationName(duration) {
        const durations = {
            'less-than-1-week': 'Less than 1 week',
            '1-2-weeks': '1-2 weeks',
            '2-4-weeks': '2-4 weeks',
            '1-2-months': '1-2 months',
            '2-3-months': '2-3 months',
            '3-6-months': '3-6 months',
            'more-than-6-months': 'More than 6 months'
        };
        return durations[duration] || duration;
    }

    getExperienceName(experience) {
        const experiences = {
            'entry': 'Entry Level',
            'intermediate': 'Intermediate',
            'expert': 'Expert'
        };
        return experiences[experience] || experience;
    }

    getRequirementName(requirement) {
        const requirements = {
            'portfolio-required': 'Portfolio/Previous work samples required',
            'interview-required': 'Interview required before hiring',
            'nda-required': 'Non-disclosure agreement (NDA) required',
            'timezone-specific': 'Specific timezone/working hours required',
            'ongoing-work': 'Potential for ongoing work'
        };
        return requirements[requirement] || requirement;
    }

    async submitJob(event) {
        event.preventDefault();
        
        if (!this.validateStep(4)) {
            return;
        }
        
        // Show loading
        talentSync.showLoading();
        
        // Prepare job data for storage
        const job = {
            ...this.jobData,
            clientId: talentSync.currentUser.id || talentSync.currentUser.uid,
            client: {
                name: talentSync.currentUser.fullName,
                avatar: talentSync.currentUser.profile.avatar,
                rating: talentSync.currentUser.profile.rating || 4.5,
                jobsPosted: (talentSync.currentUser.profile.postedJobs || 0) + 1
            },
            proposals: 0,
            postedDate: new Date().toISOString(),
            status: 'active',
            urgent: false
        };
        
        if (talentSync.useFirebase && firebaseService) {
            // Save to Firebase
            const result = await firebaseService.saveJob(job);
            if (result.success) {
                // Update user's posted jobs count
                talentSync.currentUser.profile.postedJobs = (talentSync.currentUser.profile.postedJobs || 0) + 1;
                
                // Update user profile in Firebase
                if (talentSync.currentUser.uid) {
                    await firebaseService.saveUserProfile(talentSync.currentUser.uid, talentSync.currentUser);
                }
                
                talentSync.hideLoading();
                this.showSuccessModal();
            } else {
                talentSync.hideLoading();
                talentSync.showToast('Failed to post job. Please try again.', 'error');
            }
        } else {
            // Fallback to localStorage
            job.id = Date.now();
            const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
            jobs.unshift(job);
            localStorage.setItem('jobs', JSON.stringify(jobs));
            
            // Update user's posted jobs count
            talentSync.currentUser.profile.postedJobs = (talentSync.currentUser.profile.postedJobs || 0) + 1;
            
            // Update user in storage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex(u => u.id === talentSync.currentUser.id);
            if (userIndex !== -1) {
                users[userIndex] = talentSync.currentUser;
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            sessionStorage.setItem('currentUser', JSON.stringify(talentSync.currentUser));
            
            // Simulate processing time
            setTimeout(() => {
                talentSync.hideLoading();
                this.showSuccessModal();
            }, 1500);
        }
    }

    showSuccessModal() {
        document.getElementById('success-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    goToDashboard() {
        window.location.href = 'dashboard.html';
    }

    postAnotherJob() {
        window.location.reload();
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

// Initialize job poster when page loads
const jobPoster = new JobPoster();

// Make it globally available
window.jobPoster = jobPoster;

// Firebase Configuration and Services
class FirebaseService {
    constructor() {
        this.firebaseConfig = {
            apiKey: "AIzaSyCiwHYdPhSJ3iGk3Hl309aJXr4RtiKX6ac",
            authDomain: "talentsync-42bb6.firebaseapp.com",
            projectId: "talentsync-42bb6",
            storageBucket: "talentsync-42bb6.firebasestorage.app",
            messagingSenderId: "44540457294",
            appId: "1:44540457294:web:a0a4683f9a25ca9a2c2e1f"
        };
        
        this.app = null;
        this.auth = null;
        this.db = null;
        this.storage = null;
        this.currentUser = null;
        
        this.init();
    }

    init() {
        try {
            console.log('Initializing Firebase...');
            
            // Initialize Firebase
            this.app = firebase.initializeApp(this.firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.storage = firebase.storage();
            
            console.log('Firebase app initialized:', this.app);
            console.log('Firebase auth initialized:', this.auth);
            console.log('Firebase firestore initialized:', this.db);
            
            // Initialize cache
            this.initCache();
            
            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });
            
            console.log('Firebase initialized successfully');
            
            // Initialize collections
            this.initializeCollections();
            
            // Test Firestore connection
            this.testFirestoreConnection();
            
        } catch (error) {
            console.error('Firebase initialization error:', error);
            // Fallback to localStorage if Firebase fails
            this.fallbackToLocalStorage = true;
        }
    }

    async testFirestoreConnection() {
        try {
            console.log('Testing Firestore connection...');
            
            // Try to read from jobs collection
            const jobsSnapshot = await this.db.collection('jobs').limit(1).get();
            console.log('Jobs collection test - size:', jobsSnapshot.size);
            
            // Try to read from freelancers collection
            const freelancersSnapshot = await this.db.collection('freelancers').limit(1).get();
            console.log('Freelancers collection test - size:', freelancersSnapshot.size);
            
            // Try to read from users collection
            const usersSnapshot = await this.db.collection('users').limit(1).get();
            console.log('Users collection test - size:', usersSnapshot.size);
            
            console.log('Firestore connection test successful');
            
            // Log actual data for debugging
            if (!jobsSnapshot.empty) {
                console.log('Sample job data:', jobsSnapshot.docs[0].data());
            }
            if (!freelancersSnapshot.empty) {
                console.log('Sample freelancer data:', freelancersSnapshot.docs[0].data());
            }
            
        } catch (error) {
            console.error('Firestore connection test failed:', error);
        }
    }

    // Initialize Firebase collections and security
    async initializeCollections() {
        try {
            console.log('Initializing Firebase collections...');
            
            // Enhanced collections for new features
            const collections = [
                'users', 'jobs', 'freelancers', 'proposals', 'messages',
                'projects', 'payments', 'reviews', 'notifications', 'achievements',
                'savedSearches', 'recentlyViewed', 'portfolios', 'contracts',
                'timeTracking', 'invoices', 'disputes', 'forums', 'mentorships'
            ];
            
            for (const collectionName of collections) {
                try {
                    // Test read access to each collection
                    const testQuery = await this.db.collection(collectionName).limit(1).get();
                    console.log(`Collection '${collectionName}' accessible, size: ${testQuery.size}`);
                } catch (error) {
                    console.log(`Collection '${collectionName}' may not exist or is not accessible:`, error.message);
                }
            }
            
            console.log('Firebase collections initialization completed');
        } catch (error) {
            console.error('Error initializing Firebase collections:', error);
        }
    }

    handleAuthStateChange(user) {
        console.log('Auth state changed:', user ? user.uid : 'signed out');
        
        if (user) {
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified
            };
            
            console.log('Loading user profile from Firestore...');
            // Load user profile from Firestore
            this.loadUserProfile(user.uid);
            
            // Set up real-time listeners for user data
            this.setupRealtimeListeners(user.uid);
        } else {
            this.currentUser = null;
            // Clean up listeners
            this.cleanupListeners();
            
            // Update UI to show logged out state
            if (typeof talentSync !== 'undefined') {
                talentSync.currentUser = null;
                talentSync.updateUI();
            }
        }
    }

    setupRealtimeListeners(userId) {
        // Listen to user's jobs if they're a client
        this.jobsListener = this.db.collection('jobs')
            .where('clientId', '==', userId)
            .onSnapshot((snapshot) => {
                console.log('Jobs updated in real-time');
                // Notify the app about job updates
                if (typeof window.jobsUpdated === 'function') {
                    window.jobsUpdated(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            });

        // Listen to user's proposals if they're a freelancer
        this.proposalsListener = this.db.collection('proposals')
            .where('freelancerId', '==', userId)
            .onSnapshot((snapshot) => {
                console.log('Proposals updated in real-time');
                // Notify the app about proposal updates
                if (typeof window.proposalsUpdated === 'function') {
                    window.proposalsUpdated(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            });
    }

    cleanupListeners() {
        if (this.jobsListener) {
            this.jobsListener();
            this.jobsListener = null;
        }
        if (this.proposalsListener) {
            this.proposalsListener();
            this.proposalsListener = null;
        }
        if (this.messagesListener) {
            this.messagesListener();
            this.messagesListener = null;
        }
    }

    // Authentication Methods
    async signUp(email, password, userData) {
        try {
            console.log('Firebase signUp called with email:', email);
            
            if (!this.auth) {
                throw new Error('Firebase Auth not initialized');
            }
            
            console.log('Creating user with email and password...');
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('User created successfully:', user.uid);
            
            // Update user profile
            console.log('Updating user profile...');
            await user.updateProfile({
                displayName: userData.fullName,
                photoURL: userData.profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
            });
            
            console.log('Saving user profile to Firestore...');
            // Save user data to Firestore
            const profileData = {
                ...userData,
                uid: user.uid,
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Remove password from profile data (don't store in Firestore)
            delete profileData.password;
            
            const saveResult = await this.saveUserProfile(user.uid, profileData);
            
            if (!saveResult.success) {
                console.error('Failed to save user profile:', saveResult.error);
                // Don't fail the signup if profile save fails, just log it
            }
            
            // If user is a freelancer, also add them to the freelancers collection
            if (userData.role === 'freelancer') {
                console.log('Adding user to freelancers collection...');
                try {
                    const freelancerData = {
                        uid: user.uid,
                        name: userData.fullName,
                        title: 'Freelancer', // Default title
                        category: 'general', // Default category
                        avatar: userData.profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                        location: 'Remote',
                        hourlyRate: userData.profile?.hourlyRate || 50,
                        rating: 0,
                        reviewCount: 0,
                        completedJobs: 0,
                        skills: userData.profile?.skills || [],
                        bio: userData.profile?.bio || '',
                        experience: 'entry',
                        availability: 'available',
                        email: user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    await this.saveFreelancer(freelancerData);
                    console.log('User added to freelancers collection successfully');
                } catch (freelancerError) {
                    console.error('Failed to add user to freelancers collection:', freelancerError);
                    // Don't fail signup if freelancer profile creation fails
                }
            }
            
            console.log('Firebase signup completed successfully');
            return { success: true, user: user };
        } catch (error) {
            console.error('Sign up error:', error);
            
            // Provide more user-friendly error messages
            let errorMessage = error.message;
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    async signIn(email, password) {
        try {
            console.log('Firebase signIn called with email:', email);
            
            if (!this.auth) {
                throw new Error('Firebase Auth not initialized');
            }
            
            console.log('Signing in with email and password...');
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            console.log('User signed in successfully:', userCredential.user.uid);
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            
            // Provide more user-friendly error messages
            let errorMessage = error.message;
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address. Please check your email or sign up.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled. Please contact support.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed login attempts. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    // Firestore Data Methods
    async saveUserProfile(uid, userData) {
        try {
            console.log('Saving user profile to Firestore for UID:', uid);
            
            if (!this.db) {
                throw new Error('Firestore not initialized');
            }
            
            // Ensure we have the users collection
            const userRef = this.db.collection('users').doc(uid);
            
            // Prepare user data for Firestore
            const profileData = {
                ...userData,
                uid: uid,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Remove password if it exists (never store passwords in Firestore)
            delete profileData.password;
            
            console.log('Saving profile data:', { ...profileData, createdAt: 'timestamp', updatedAt: 'timestamp' });
            
            await userRef.set(profileData, { merge: true });
            console.log('User profile saved successfully to Firestore');
            
            return { success: true };
        } catch (error) {
            console.error('Save user profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async loadUserProfile(uid) {
        try {
            console.log('Loading user profile for UID:', uid);
            const doc = await this.db.collection('users').doc(uid).get();
            
            if (doc.exists) {
                const userData = doc.data();
                console.log('User profile loaded successfully:', userData.fullName);
                
                // Update talentSync current user
                if (typeof talentSync !== 'undefined') {
                    talentSync.currentUser = {
                        id: uid,
                        uid: uid,
                        ...userData
                    };
                    console.log('Updated talentSync currentUser');
                    talentSync.updateUI();
                    
                    // Dispatch a custom event to notify that user is loaded
                    window.dispatchEvent(new CustomEvent('userLoaded', { 
                        detail: { user: talentSync.currentUser } 
                    }));
                }
                return { success: true, data: userData };
            } else {
                console.log('User profile not found in Firestore');
                return { success: false, error: 'User profile not found' };
            }
        } catch (error) {
            console.error('Load user profile error:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user exists in users collection
    async checkUserExists(uid) {
        try {
            const doc = await this.db.collection('users').doc(uid).get();
            return doc.exists;
        } catch (error) {
            console.error('Error checking if user exists:', error);
            return false;
        }
    }

    // Jobs Methods
    async saveJob(jobData) {
        try {
            const docRef = await this.db.collection('jobs').add({
                ...jobData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Save job error:', error);
            return { success: false, error: error.message };
        }
    }

    /* FIXED: Allow clients to update or delete their own jobs */
    async updateJob(jobId, updates) {
        try {
            if (!jobId) {
                throw new Error('Job ID is required for update');
            }

            await this.db.collection('jobs').doc(jobId).update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            return { success: true };
        } catch (error) {
            console.error('Update job error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteJob(jobId) {
        try {
            if (!jobId) {
                throw new Error('Job ID is required for delete');
            }

            await this.db.collection('jobs').doc(jobId).delete();
            return { success: true };
        } catch (error) {
            console.error('Delete job error:', error);
            return { success: false, error: error.message };
        }
    }

    async loadJobs(filters = {}) {
        try {
            console.log('Loading jobs from Firestore with filters:', filters);
            
            // Start with basic query
            let query = this.db.collection('jobs');
            
            // Apply only one filter at a time to avoid composite index requirements
            if (filters.clientId) {
                query = query.where('clientId', '==', filters.clientId);
                console.log('Applied clientId filter:', filters.clientId);
            } else if (filters.category) {
                query = query.where('category', '==', filters.category);
                console.log('Applied category filter:', filters.category);
            } else if (filters.status) {
                query = query.where('status', '==', filters.status);
                console.log('Applied status filter:', filters.status);
            }
            
            // Don't use orderBy with filters to avoid composite index requirements
            // We'll sort client-side instead
            
            const snapshot = await query.get();
            const jobs = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                // FIXED: Normalize Firestore job shape to match UI expectations
                const budgetType = data.budgetType || data.budget?.type || 'fixed';
                const budgetMin =
                    data.budgetMin != null ? Number(data.budgetMin) :
                    data.budget?.min != null ? Number(data.budget.min) :
                    data.hourlyMin != null ? Number(data.hourlyMin) :
                    0;
                const budgetMax =
                    data.budgetMax != null ? Number(data.budgetMax) :
                    data.budget?.max != null ? Number(data.budget.max) :
                    data.hourlyMax != null ? Number(data.hourlyMax) :
                    0;

                const postedDate =
                    data.postedDate ||
                    data.createdAt?.toDate?.()?.toISOString?.() ||
                    new Date().toISOString();

                jobs.push({
                    id: doc.id,
                    ...data,
                    // Ensure we have required fields
                    title: data.title || 'Untitled Job',
                    description: data.description || 'No description available',
                    category: data.category || 'general',
                    status: data.status || 'active',
                    postedDate,
                    proposals: typeof data.proposals === 'number' ? data.proposals : (data.proposals || 0),
                    location: data.location || 'Remote',
                    skills: Array.isArray(data.skills) ? data.skills : [],
                    experience: data.experienceLevel || data.experience || 'intermediate',
                    duration: data.duration || 'medium',
                    budget: {
                        type: budgetType,
                        min: budgetMin,
                        max: budgetMax,
                    },
                    client: data.client || {
                        name: data.clientName || 'Client',
                        avatar: data.clientAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face',
                        rating: data.clientRating || 4.5,
                        jobsPosted: data.clientJobsPosted || 0,
                        id: data.clientId,
                        uid: data.clientId,
                    },
                });
            });
            
            // Sort client-side by date (newest first)
            jobs.sort((a, b) => {
                const dateA = new Date(a.postedDate || a.createdAt || 0);
                const dateB = new Date(b.postedDate || b.createdAt || 0);
                return dateB - dateA;
            });
            
            console.log(`Successfully loaded ${jobs.length} jobs from Firestore`);
            return { success: true, data: jobs };
        } catch (error) {
            console.error('Load jobs error:', error);
            // Handle specific Firebase errors gracefully
            if (error.message && error.message.includes('index')) {
                console.warn('Firestore index required. Returning empty array to prevent app crash.');
                return { success: true, data: [] };
            }
            return { success: false, error: error.message };
        }
    }

    // Freelancers Methods
    async saveFreelancer(freelancerData) {
        try {
            const docRef = await this.db.collection('freelancers').add({
                ...freelancerData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Save freelancer error:', error);
            return { success: false, error: error.message };
        }
    }

    async loadFreelancers(filters = {}) {
        try {
            console.log('Loading freelancers from Firestore with filters:', filters);
            
            // Start with basic query - don't order by rating initially to avoid index issues
            let query = this.db.collection('freelancers');
            
            // Apply filters first
            if (filters.category) {
                query = query.where('category', '==', filters.category);
            }
            if (filters.skills) {
                query = query.where('skills', 'array-contains-any', filters.skills);
            }
            
            // Try to order by rating, but handle the case where it doesn't exist
            try {
                query = query.orderBy('rating', 'desc');
            } catch (orderError) {
                console.log('Cannot order by rating, using default order');
            }
            
            const snapshot = await query.get();
            const freelancers = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                freelancers.push({ 
                    id: doc.id, 
                    ...data,
                    // Ensure we have required fields
                    name: data.name || 'Unknown Freelancer',
                    title: data.title || 'Freelancer',
                    category: data.category || 'general',
                    rating: data.rating || 0,
                    hourlyRate: data.hourlyRate || 0
                });
            });
            
            console.log(`Successfully loaded ${freelancers.length} freelancers from Firestore`);
            return { success: true, data: freelancers };
        } catch (error) {
            console.error('Load freelancers error:', error);
            return { success: false, error: error.message };
        }
    }

    /* FIXED: Add missing Firebase helpers used across UI */
    async saveProposal(proposalData) {
        try {
            const docRef = await this.db.collection('proposals').add({
                ...proposalData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Save proposal error:', error);
            return { success: false, error: error.message };
        }
    }

    async loadProposals(filters = {}) {
        try {
            console.log('Loading proposals from Firestore with filters:', filters);
            let query = this.db.collection('proposals');

            // Apply only one filter at a time to avoid composite index requirements
            if (filters.freelancerId) {
                query = query.where('freelancerId', '==', filters.freelancerId);
                console.log('Applied freelancerId filter:', filters.freelancerId);
            } else if (filters.clientId) {
                query = query.where('clientId', '==', filters.clientId);
                console.log('Applied clientId filter:', filters.clientId);
            } else if (filters.jobId) {
                query = query.where('jobId', '==', filters.jobId);
                console.log('Applied jobId filter:', filters.jobId);
            }

            // Don't use orderBy with filters to avoid composite index requirements
            const snapshot = await query.get();
            let proposals = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
                updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
            }));

            // Apply additional filters client-side
            if (filters.status && filters.status !== 'all') {
                proposals = proposals.filter(p => p.status === filters.status);
            }

            // Sort client-side by creation date (newest first)
            proposals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            console.log(`Successfully loaded ${proposals.length} proposals from Firestore`);
            return { success: true, data: proposals };
        } catch (error) {
            console.error('Load proposals error:', error);
            // Handle index errors gracefully
            if (error.message && error.message.includes('index')) {
                console.warn('Firestore index required for proposals. Returning empty array.');
                return { success: true, data: [] };
            }
            return { success: false, error: error.message };
        }
    }

    listenToJobs(callback) {
        if (!this.db) return null;

        try {
            let query = this.db.collection('jobs');
            try {
                query = query.orderBy('createdAt', 'desc');
            } catch (orderErr) {
                console.log('Jobs listener orderBy fallback:', orderErr.message);
            }
            return query.onSnapshot(callback, (error) => {
                console.error('Jobs listener error:', error);
            });
        } catch (error) {
            console.error('listenToJobs error:', error);
            return null;
        }
    }

    listenToUserJobs(userId, callback) {
        if (!this.db || !userId) return null;

        try {
            let query = this.db.collection('jobs').where('clientId', '==', userId);
            try {
                query = query.orderBy('createdAt', 'desc');
            } catch (orderErr) {
                console.log('User jobs listener orderBy fallback:', orderErr.message);
            }
            return query.onSnapshot(callback, (error) => {
                console.error('User jobs listener error:', error);
            });
        } catch (error) {
            console.error('listenToUserJobs error:', error);
            return null;
        }
    }

    listenToUserProposals(userId, callback) {
        if (!this.db || !userId) return null;

        try {
            let query = this.db.collection('proposals').where('freelancerId', '==', userId);
            try {
                query = query.orderBy('createdAt', 'desc');
            } catch (orderErr) {
                console.log('User proposals listener orderBy fallback:', orderErr.message);
            }
            return query.onSnapshot(callback, (error) => {
                console.error('User proposals listener error:', error);
            });
        } catch (error) {
            console.error('listenToUserProposals error:', error);
            return null;
        }
    }

    async executeWithRetry(fn, retries = 3, delay = 500) {
        let attempt = 0;
        while (attempt < retries) {
            try {
                return await fn();
            } catch (err) {
                attempt++;
                if (attempt >= retries) {
                    throw err;
                }
                await new Promise((res) => setTimeout(res, delay));
            }
        }
    }

    // Initialize simple cache
    initCache() {
        this.cache = new Map();
        
        // Clear cache every 10 minutes
        setInterval(() => {
            this.cache.clear();
            console.log('Firebase cache cleared');
        }, 600000);
    }

    // Simple ID generator for documents that need a client-generated id
    generateId() {
        return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    }

    // Utility Methods
    async initializeDemoData() {
        try {
            console.log('Checking if demo data initialization is needed...');
            
            // Check if demo data already exists
            const jobsSnapshot = await this.db.collection('jobs').limit(1).get();
            const freelancersSnapshot = await this.db.collection('freelancers').limit(1).get();
            
            console.log('Existing jobs:', jobsSnapshot.size);
            console.log('Existing freelancers:', freelancersSnapshot.size);
            
            if (jobsSnapshot.empty) {
                console.log('No jobs found, creating demo jobs...');
                await this.createDemoJobs();
            }
            
            if (freelancersSnapshot.empty) {
                console.log('No freelancers found, creating demo freelancers...');
                await this.createDemoFreelancers();
            }
            
            console.log('Demo data initialization completed');
        } catch (error) {
            console.error('Initialize demo data error:', error);
        }
    }

    async createDemoJobs() {
        const demoJobs = [
            {
                title: 'Full Stack Developer for E-commerce Platform',
                category: 'web-development',
                description: 'Looking for an experienced full-stack developer to build a modern e-commerce platform with React and Node.js. The project involves creating a responsive frontend, RESTful APIs, payment integration, and admin dashboard.',
                budgetType: 'fixed',
                budgetMin: 3000,
                budgetMax: 5000,
                duration: 'long',
                experience: 'expert',
                skills: ['React', 'Node.js', 'MongoDB', 'Express.js', 'Payment Integration'],
                status: 'active',
                location: 'Remote',
                clientId: 'demo-client-1',
                clientName: 'Tech Startup Inc.',
                clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                clientRating: 4.8,
                clientJobsPosted: 15,
                proposals: 8,
                postedDate: new Date().toISOString()
            },
            {
                title: 'Mobile App UI/UX Designer',
                category: 'design',
                description: 'Need a talented UI/UX designer to create beautiful and intuitive mobile app designs for iOS and Android. Must have experience with Figma and modern design principles.',
                budgetType: 'hourly',
                hourlyMin: 40,
                hourlyMax: 80,
                duration: 'medium',
                experience: 'intermediate',
                skills: ['Figma', 'UI/UX Design', 'Mobile Design', 'Prototyping', 'User Research'],
                status: 'active',
                location: 'Remote',
                clientId: 'demo-client-2',
                clientName: 'Design Agency Pro',
                clientAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
                clientRating: 4.9,
                clientJobsPosted: 23,
                proposals: 12,
                postedDate: new Date(Date.now() - 86400000).toISOString()
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
                clientJobsPosted: 8,
                postedDate: new Date(Date.now() - 2 * 86400000).toISOString()
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
                clientJobsPosted: 15,
                postedDate: new Date(Date.now() - 3 * 86400000).toISOString()
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
                clientJobsPosted: 3,
                postedDate: new Date(Date.now() - 4 * 86400000).toISOString()
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
                clientJobsPosted: 20,
                postedDate: new Date(Date.now() - 5 * 86400000).toISOString()
            }
        ];

        for (const job of demoJobs) {
            try {
                const result = await this.saveJob(job);
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

    async createDemoFreelancers() {
        const demoFreelancers = [
            {
                name: 'Sarah Johnson',
                title: 'Full Stack Developer',
                category: 'web-development',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
                location: 'Remote',
                hourlyRate: 85,
                rating: 4.9,
                reviewCount: 127,
                completedJobs: 156,
                skills: ['React', 'Node.js', 'Python', 'AWS', 'MongoDB', 'Express.js'],
                bio: 'Passionate full-stack developer with 6+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud technologies.',
                experience: 'expert',
                availability: 'available'
            },
            {
                name: 'Michael Chen',
                title: 'UI/UX Designer',
                category: 'design',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
                location: 'San Francisco, USA',
                hourlyRate: 75,
                rating: 4.8,
                reviewCount: 89,
                completedJobs: 98,
                skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'Mobile Design'],
                bio: 'Creative UI/UX designer focused on user experience and visual storytelling. 5+ years of experience in mobile and web design.',
                experience: 'expert',
                availability: 'available'
            }
        ];

        for (const freelancer of demoFreelancers) {
            try {
                const result = await this.saveFreelancer(freelancer);
                if (result.success) {
                    console.log(`Created demo freelancer: ${freelancer.name}`);
                }
            } catch (error) {
                console.error(`Failed to create demo freelancer: ${freelancer.name}`, error);
            }
        }
    }

    // Debug function to test data loading
    async debugDataLoading() {
        console.log('=== DEBUG: Testing Firebase Data Loading ===');
        
        try {
            // Test jobs loading
            console.log('Testing jobs loading...');
            const jobsResult = await this.loadJobs();
            console.log('Jobs result:', jobsResult);
            
            // Test freelancers loading
            console.log('Testing freelancers loading...');
            const freelancersResult = await this.loadFreelancers();
            console.log('Freelancers result:', freelancersResult);
            
            // Test users loading
            console.log('Testing users collection...');
            const usersSnapshot = await this.db.collection('users').get();
            console.log('Users count:', usersSnapshot.size);
            
            console.log('=== DEBUG: Data loading test completed ===');
            
            return {
                jobs: jobsResult,
                freelancers: freelancersResult,
                usersCount: usersSnapshot.size
            };
        } catch (error) {
            console.error('Debug data loading failed:', error);
            return { error: error.message };
        }
    }

    // Payment Management
    async createPayment(paymentData) {
        try {
            console.log('Creating payment:', paymentData);
            
            const payment = {
                ...paymentData,
                id: this.generateId(),
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('payments').add(payment);
            console.log('Payment created with ID:', docRef.id);
            
            return { success: true, id: docRef.id, payment };
        } catch (error) {
            console.error('Error creating payment:', error);
            return { success: false, error: error.message };
        }
    }

    async getPaymentHistory(userId, userRole = 'client') {
        try {
            const field = userRole === 'client' ? 'clientId' : 'freelancerId';
            const snapshot = await this.db.collection('payments')
                .where(field, '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            const payments = [];
            snapshot.forEach(doc => {
                payments.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()?.toISOString(),
                    updatedAt: doc.data().updatedAt?.toDate()?.toISOString()
                });
            });

            return { success: true, payments };
        } catch (error) {
            console.error('Error fetching payment history:', error);
            return { success: false, error: error.message };
        }
    }

    async updatePaymentStatus(paymentId, status, metadata = {}) {
        try {
            await this.db.collection('payments').doc(paymentId).update({
                status,
                ...metadata,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating payment status:', error);
            return { success: false, error: error.message };
        }
    }

    // Contract/Milestone Management
    async createContract(contractData) {
        try {
            const contract = {
                ...contractData,
                id: this.generateId(),
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('contracts').add(contract);
            return { success: true, id: docRef.id, contract };
        } catch (error) {
            console.error('Error creating contract:', error);
            return { success: false, error: error.message };
        }
    }

    async getContract(contractId) {
        try {
            const doc = await this.db.collection('contracts').doc(contractId).get();
            if (doc.exists) {
                return {
                    success: true,
                    contract: {
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate()?.toISOString(),
                        updatedAt: doc.data().updatedAt?.toDate()?.toISOString()
                    }
                };
            }
            return { success: false, error: 'Contract not found' };
        } catch (error) {
            console.error('Error fetching contract:', error);
            return { success: false, error: error.message };
        }
    }

    async updateMilestone(contractId, milestoneId, updates) {
        try {
            const contractRef = this.db.collection('contracts').doc(contractId);
            const contractDoc = await contractRef.get();
            
            if (!contractDoc.exists) {
                return { success: false, error: 'Contract not found' };
            }

            const contract = contractDoc.data();
            const milestones = contract.milestones || [];
            const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);
            
            if (milestoneIndex === -1) {
                return { success: false, error: 'Milestone not found' };
            }

            milestones[milestoneIndex] = {
                ...milestones[milestoneIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await contractRef.update({
                milestones,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating milestone:', error);
            return { success: false, error: error.message };
        }
    }

    // Time Tracking Methods
    async saveTimeLog(timeLogData) {
        try {
            const timeLog = {
                ...timeLogData,
                id: this.generateId(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('timeLogs').add(timeLog);
            return { success: true, id: docRef.id, timeLog };
        } catch (error) {
            console.error('Error saving time log:', error);
            return { success: false, error: error.message };
        }
    }

    async getTimeLogs(projectId, freelancerId) {
        try {
            let query = this.db.collection('timeLogs');
            
            if (projectId) {
                query = query.where('projectId', '==', projectId);
            }
            
            if (freelancerId) {
                query = query.where('freelancerId', '==', freelancerId);
            }

            const snapshot = await query.orderBy('startTime', 'desc').get();
            const timeLogs = [];

            snapshot.forEach(doc => {
                timeLogs.push({
                    id: doc.id,
                    ...doc.data(),
                    startTime: doc.data().startTime?.toDate()?.toISOString(),
                    endTime: doc.data().endTime?.toDate()?.toISOString(),
                    createdAt: doc.data().createdAt?.toDate()?.toISOString()
                });
            });

            return { success: true, timeLogs };
        } catch (error) {
            console.error('Error fetching time logs:', error);
            return { success: false, error: error.message };
        }
    }

    // Portfolio Management
    async savePortfolioItem(portfolioData) {
        try {
            const portfolioItem = {
                ...portfolioData,
                id: this.generateId(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('portfolio').add(portfolioItem);
            return { success: true, id: docRef.id, portfolioItem };
        } catch (error) {
            console.error('Error saving portfolio item:', error);
            return { success: false, error: error.message };
        }
    }

    async getPortfolio(freelancerId) {
        try {
            const snapshot = await this.db.collection('portfolio')
                .where('freelancerId', '==', freelancerId)
                .orderBy('createdAt', 'desc')
                .get();

            const portfolio = [];
            snapshot.forEach(doc => {
                portfolio.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()?.toISOString(),
                    updatedAt: doc.data().updatedAt?.toDate()?.toISOString()
                });
            });

            return { success: true, portfolio };
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            return { success: false, error: error.message };
        }
    }

    async deletePortfolioItem(itemId, freelancerId) {
        try {
            // Verify ownership
            const doc = await this.db.collection('portfolio').doc(itemId).get();
            if (!doc.exists || doc.data().freelancerId !== freelancerId) {
                return { success: false, error: 'Portfolio item not found or unauthorized' };
            }

            await this.db.collection('portfolio').doc(itemId).delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting portfolio item:', error);
            return { success: false, error: error.message };
        }
    }

    // Advanced Notifications
    async createNotification(notificationData) {
        try {
            const notification = {
                ...notificationData,
                id: this.generateId(),
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('notifications').add(notification);
            return { success: true, id: docRef.id, notification };
        } catch (error) {
            console.error('Error creating notification:', error);
            return { success: false, error: error.message };
        }
    }

    async getNotifications(userId, limit = 20) {
        try {
            const snapshot = await this.db.collection('notifications')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const notifications = [];
            snapshot.forEach(doc => {
                notifications.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()?.toISOString()
                });
            });

            return { success: true, notifications };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return { success: false, error: error.message };
        }
    }

    async markNotificationRead(notificationId) {
        try {
            await this.db.collection('notifications').doc(notificationId).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    }

    // Message Methods
    async saveMessage(messageData) {
        try {
            console.log('Saving message to Firestore:', messageData);
            
            // Ensure a conversationId exists for threading
            if (!messageData.conversationId && messageData.senderId && messageData.receiverId) {
                messageData.conversationId = `${messageData.senderId}_${messageData.receiverId}`;
            }

            const message = {
                ...messageData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('messages').add(message);
            console.log('Message saved with ID:', docRef.id);
            
            return { success: true, id: docRef.id, message };
        } catch (error) {
            console.error('Error saving message:', error);
            return { success: false, error: error.message };
        }
    }

    async loadMessages(userId) {
        try {
            console.log('Loading messages for user:', userId);
            
            // Get messages where user is sender or receiver
            const sentSnapshot = await this.db.collection('messages')
                .where('senderId', '==', userId)
                .get();
            
            const receivedSnapshot = await this.db.collection('messages')
                .where('receiverId', '==', userId)
                .get();

            const messages = [];
            
            sentSnapshot.forEach(doc => {
                messages.push({
                    id: doc.id,
                    ...doc.data(),
                    conversationId: doc.data().conversationId || `${doc.data().senderId}_${doc.data().receiverId}`,
                    timestamp: doc.data().timestamp || doc.data().createdAt?.toDate()?.toISOString()
                });
            });
            
            receivedSnapshot.forEach(doc => {
                messages.push({
                    id: doc.id,
                    ...doc.data(),
                    conversationId: doc.data().conversationId || `${doc.data().senderId}_${doc.data().receiverId}`,
                    timestamp: doc.data().timestamp || doc.data().createdAt?.toDate()?.toISOString()
                });
            });

            // Sort by timestamp
            messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            console.log(`Loaded ${messages.length} messages from Firestore`);
            return { success: true, data: messages };
        } catch (error) {
            console.error('Error loading messages:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize Firebase service
const firebaseService = new FirebaseService();

// Make it globally available
window.firebaseService = firebaseService;

// Ensure talentSync can access Firebase service
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Make sure talentSync knows about Firebase service
        if (typeof talentSync !== 'undefined') {
            talentSync.firebaseService = firebaseService;
        }
    });
}
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
            
            // Check if collections exist and create indexes if needed
            const collections = ['users', 'jobs', 'freelancers', 'proposals', 'messages'];
            
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

    async loadJobs(filters = {}) {
        try {
            console.log('Loading jobs from Firestore with filters:', filters);
            
            // Start with basic query - don't order by createdAt initially to avoid index issues
            let query = this.db.collection('jobs');
            
            // Apply filters first
            if (filters.category) {
                query = query.where('category', '==', filters.category);
            }
            if (filters.clientId) {
                query = query.where('clientId', '==', filters.clientId);
            }
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            
            // Try to order by createdAt, but handle the case where it doesn't exist
            try {
                query = query.orderBy('createdAt', 'desc');
            } catch (orderError) {
                console.log('Cannot order by createdAt, using default order');
            }
            
            const snapshot = await query.get();
            const jobs = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                jobs.push({ 
                    id: doc.id, 
                    ...data,
                    // Ensure we have required fields
                    title: data.title || 'Untitled Job',
                    description: data.description || 'No description available',
                    category: data.category || 'general',
                    status: data.status || 'active'
                });
            });
            
            console.log(`Successfully loaded ${jobs.length} jobs from Firestore`);
            return { success: true, data: jobs };
        } catch (error) {
            console.error('Load jobs error:', error);
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

    // Initialize simple cache
    initCache() {
        this.cache = new Map();
        
        // Clear cache every 10 minutes
        setInterval(() => {
            this.cache.clear();
            console.log('Firebase cache cleared');
        }, 600000);
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
                duration: '2-3-months',
                experienceLevel: 'expert',
                skills: ['React', 'Node.js', 'MongoDB', 'Express.js', 'Payment Integration'],
                status: 'active',
                clientId: 'demo-client-1',
                client: {
                    name: 'Tech Startup Inc.',
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                    rating: 4.8,
                    jobsPosted: 15
                },
                proposals: 8,
                postedDate: new Date().toISOString(),
                urgent: false
            },
            {
                title: 'Mobile App UI/UX Designer',
                category: 'design',
                description: 'Need a talented UI/UX designer to create beautiful and intuitive mobile app designs for iOS and Android. Must have experience with Figma and modern design principles.',
                budgetType: 'hourly',
                hourlyMin: 40,
                hourlyMax: 80,
                duration: '1-2-months',
                experienceLevel: 'intermediate',
                skills: ['Figma', 'UI/UX Design', 'Mobile Design', 'Prototyping', 'User Research'],
                status: 'active',
                clientId: 'demo-client-2',
                client: {
                    name: 'Design Agency Pro',
                    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
                    rating: 4.9,
                    jobsPosted: 23
                },
                proposals: 12,
                postedDate: new Date(Date.now() - 86400000).toISOString(),
                urgent: true
            }
        ];

        for (const job of demoJobs) {
            try {
                const result = await this.saveJob(job);
                if (result.success) {
                    console.log(`Created demo job: ${job.title}`);
                }
            } catch (error) {
                console.error(`Failed to create demo job: ${job.title}`, error);
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
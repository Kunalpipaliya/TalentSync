// Messages Application JavaScript
class MessageApp {
    constructor() {
        this.conversations = [];
        this.activeConversation = null;
        this.users = [];
        this.typingTimeout = null;
        
        this.init();
    }

    init() {
        // Wait for talentSync to be initialized
        if (typeof talentSync !== 'undefined') {
            this.waitForUserAuth();
        } else {
            // Retry after a short delay
            setTimeout(() => this.init(), 100);
        }
    }

    async waitForUserAuth() {
        console.log('Messages: Waiting for user authentication...');
        
        // Wait up to 5 seconds for user authentication
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (talentSync.currentUser) {
                console.log('Messages: User authenticated, initializing messages');
                this.setupNavigation();
                this.loadUsers();
                await this.loadMessagesFromFirestore();
                this.setupEventListeners();
                this.loadConversations();
                return;
            }
            
            // Check if Firebase user exists
            if (firebaseService && firebaseService.auth && firebaseService.auth.currentUser) {
                console.log('Messages: Firebase user found, waiting for profile load...');
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            
            if (attempts % 10 === 0) {
                console.log(`Messages: Still waiting for user... attempt ${attempts}/${maxAttempts}`);
            }
        }
        
        console.log('Messages: User authentication timeout, redirecting to home');
        this.showAuthError();
    }

    showAuthError() {
        // Show error message before redirecting
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="auth-error">
                    <div class="auth-error-content">
                        <i class="fas fa-lock"></i>
                        <h2>Authentication Required</h2>
                        <p>Please log in to access your messages.</p>
                        <button class="btn btn-primary" onclick="window.location.href='index.html'">
                            Go to Login
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Redirect after showing the message
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    checkUserAuth() {
        if (!talentSync.currentUser) {
            console.log('Messages: No user found in checkUserAuth');
            return false;
        }
        return true;
    }

    setupNavigation() {
        // Let talentSync handle navigation
        if (talentSync) {
            talentSync.updateUI();
        }
        
        // Setup mobile navigation
        this.setupMobileNavigation();
    }

    setupMobileNavigation() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            // Add ARIA attributes for accessibility
            navToggle.setAttribute('aria-label', 'Toggle navigation menu');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-controls', 'nav-menu');
            navMenu.setAttribute('aria-hidden', 'true');

            navToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isActive = navMenu.classList.contains('active');
                
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');

                // Update ARIA attributes
                navToggle.setAttribute('aria-expanded', !isActive);
                navMenu.setAttribute('aria-hidden', isActive);
                
                // Prevent body scroll when menu is open
                if (navMenu.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
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
                if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });

            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                    this.closeMobileMenu();
                    navToggle.focus();
                }
            });
        }

        // Setup mobile messages navigation
        this.setupMobileMessagesNavigation();
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

    setupMobileMessagesNavigation() {
        // Add mobile navigation for messages
        const conversationItems = document.querySelectorAll('.conversation-item');
        const chatArea = document.querySelector('.chat-area');
        const conversationsSidebar = document.querySelector('.conversations-sidebar');

        conversationItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    // Mobile: Show chat area and hide conversations
                    if (chatArea) {
                        chatArea.classList.add('active');
                        chatArea.style.display = 'flex';
                    }
                    if (conversationsSidebar) {
                        conversationsSidebar.classList.add('chat-active');
                    }
                    
                    // Add back button to chat header
                    this.addMobileBackButton();
                }
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                // Desktop: Reset mobile states
                if (chatArea) {
                    chatArea.classList.remove('active');
                    chatArea.style.display = 'flex';
                }
                if (conversationsSidebar) {
                    conversationsSidebar.classList.remove('chat-active');
                }
                this.removeMobileBackButton();
            }
        });
    }

    addMobileBackButton() {
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader && !chatHeader.querySelector('.mobile-back-btn')) {
            const backButton = document.createElement('button');
            backButton.className = 'mobile-back-btn btn btn-outline';
            backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
            backButton.style.marginRight = '1rem';
            
            backButton.addEventListener('click', () => {
                this.showConversationsList();
            });
            
            chatHeader.insertBefore(backButton, chatHeader.firstChild);
        }
    }

    removeMobileBackButton() {
        const backButton = document.querySelector('.mobile-back-btn');
        if (backButton) {
            backButton.remove();
        }
    }

    showConversationsList() {
        const chatArea = document.querySelector('.chat-area');
        const conversationsSidebar = document.querySelector('.conversations-sidebar');
        
        if (chatArea) {
            chatArea.classList.remove('active');
            if (window.innerWidth <= 768) {
                chatArea.style.display = 'none';
            }
        }
        if (conversationsSidebar) {
            conversationsSidebar.classList.remove('chat-active');
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

    loadUsers() {
        // Load users from localStorage
        const storedUsers = localStorage.getItem('users');
        if (storedUsers) {
            this.users = JSON.parse(storedUsers);
        }
        
        // Load freelancers as potential contacts
        const storedFreelancers = localStorage.getItem('freelancers');
        if (storedFreelancers) {
            const freelancers = JSON.parse(storedFreelancers);
            freelancers.forEach(freelancer => {
                // Add freelancer to users list if not already there
                const existingUser = this.users.find(u => u.id == freelancer.id || u.uid == freelancer.id);
                if (!existingUser) {
                    this.users.push({
                        id: freelancer.id,
                        uid: freelancer.uid || freelancer.id,
                        fullName: freelancer.name,
                        email: `${freelancer.name.toLowerCase().replace(' ', '.')}@example.com`,
                        role: 'freelancer',
                        profile: {
                            avatar: freelancer.avatar,
                            bio: freelancer.bio,
                            skills: freelancer.skills || []
                        }
                    });
                }
            });
        }
        
        console.log('Messages: Loaded users:', this.users.length);
    }

    async loadMessagesFromFirestore() {
        console.log('Messages: Loading messages from Firestore...');
        
        if (!firebaseService || !firebaseService.db) {
            console.log('Messages: Firebase not available, using demo data');
            this.generateDemoConversations();
            return;
        }

        try {
            const currentUserId = talentSync.currentUser.uid || talentSync.currentUser.id;
            console.log('Messages: Loading messages for user:', currentUserId);
            
            const result = await firebaseService.loadMessages(currentUserId);
            
            if (result.success && result.data && result.data.length > 0) {
                console.log(`Messages: Loaded ${result.data.length} messages from Firestore`);
                
                // Group messages by conversation
                const conversationsMap = new Map();
                
                result.data.forEach(msg => {
                    const convId = msg.conversationId;
                    
                    if (!conversationsMap.has(convId)) {
                        // Extract participant IDs from conversationId
                        const participants = convId.split('_').filter(id => id);
                        
                        conversationsMap.set(convId, {
                            id: convId,
                            participants: participants,
                            messages: [],
                            lastActivity: msg.timestamp,
                            unreadCount: 0
                        });
                    }
                    
                    const conversation = conversationsMap.get(convId);
                    
                    // Add sender info to message if not in users list
                    const sender = this.users.find(u => u.id == msg.senderId || u.uid == msg.senderId);
                    if (!sender && msg.senderName) {
                        // Add sender to users list
                        this.users.push({
                            id: msg.senderId,
                            uid: msg.senderId,
                            fullName: msg.senderName,
                            email: 'user@example.com',
                            role: 'user',
                            profile: {
                                avatar: msg.senderAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                                bio: ''
                            }
                        });
                    }
                    
                    // Add receiver info to message if not in users list
                    const receiver = this.users.find(u => u.id == msg.receiverId || u.uid == msg.receiverId);
                    if (!receiver && msg.receiverName) {
                        // Add receiver to users list
                        this.users.push({
                            id: msg.receiverId,
                            uid: msg.receiverId,
                            fullName: msg.receiverName,
                            email: 'user@example.com',
                            role: 'user',
                            profile: {
                                avatar: msg.receiverAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                                bio: ''
                            }
                        });
                    }
                    
                    conversation.messages.push({
                        id: msg.id,
                        senderId: msg.senderId,
                        content: msg.message,
                        timestamp: msg.timestamp,
                        read: msg.read
                    });
                    
                    // Update last activity
                    if (new Date(msg.timestamp) > new Date(conversation.lastActivity)) {
                        conversation.lastActivity = msg.timestamp;
                    }
                    
                    // Count unread messages
                    if (msg.senderId != currentUserId && !msg.read) {
                        conversation.unreadCount++;
                    }
                });
                
                // Convert map to array and sort messages
                this.conversations = Array.from(conversationsMap.values()).map(conv => {
                    conv.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    return conv;
                });
                
                console.log(`Messages: Created ${this.conversations.length} conversations`);
            } else {
                console.log('Messages: No messages found in Firestore, using demo data');
                this.generateDemoConversations();
            }
        } catch (error) {
            console.error('Messages: Error loading messages from Firestore:', error);
            this.generateDemoConversations();
        }
    }

    generateDemoConversations() {
        // Check if conversations already exist
        const existingConversations = localStorage.getItem(`conversations_${talentSync.currentUser.id}`);
        if (existingConversations) {
            this.conversations = JSON.parse(existingConversations);
            return;
        }

        const demoMessages = [
            "Hi! I saw your project and I'm interested in working with you.",
            "Thanks for your proposal. Can we discuss the timeline?",
            "Sure! I can complete this within 2 weeks.",
            "That sounds perfect. When can we start?",
            "I can start immediately. Let me know if you have any questions.",
            "Great! I'll send you the project details.",
            "Looking forward to working with you!",
            "Thank you for choosing me for this project.",
            "The first milestone is ready for review.",
            "Excellent work! Please proceed with the next phase."
        ];

        // Create conversations with other users
        const otherUsers = this.users.filter(u => u.id !== talentSync.currentUser.id).slice(0, 8);
        
        this.conversations = otherUsers.map((user, index) => {
            const conversationId = `conv_${talentSync.currentUser.id}_${user.id}`;
            const messages = [];
            
            // Generate 3-7 demo messages per conversation
            const messageCount = Math.floor(Math.random() * 5) + 3;
            
            for (let i = 0; i < messageCount; i++) {
                const isFromCurrentUser = Math.random() > 0.5;
                const messageTime = new Date(Date.now() - (messageCount - i) * 3600000); // 1 hour apart
                
                messages.push({
                    id: `msg_${Date.now()}_${i}`,
                    senderId: isFromCurrentUser ? talentSync.currentUser.id : user.id,
                    content: demoMessages[Math.floor(Math.random() * demoMessages.length)],
                    timestamp: messageTime.toISOString(),
                    read: isFromCurrentUser || Math.random() > 0.3
                });
            }
            
            return {
                id: conversationId,
                participants: [talentSync.currentUser.id, user.id],
                messages: messages,
                lastActivity: messages[messages.length - 1].timestamp,
                unreadCount: messages.filter(m => m.senderId !== talentSync.currentUser.id && !m.read).length
            };
        });
        
        // Save conversations
        localStorage.setItem(`conversations_${talentSync.currentUser.id}`, JSON.stringify(this.conversations));
    }

    setupEventListeners() {
        console.log('Messages: Setting up event listeners...');
        
        // Message form submission
        const messageForm = document.getElementById('message-form');
        if (messageForm) {
            console.log('Messages: Found message form, adding submit listener');
            messageForm.addEventListener('submit', (e) => {
                console.log('Messages: Form submit event triggered');
                this.sendMessage(e);
            });
            
            // Also add click listener to send button as backup
            const sendBtn = messageForm.querySelector('.send-btn');
            if (sendBtn) {
                console.log('Messages: Found send button, adding click listener');
                sendBtn.addEventListener('click', (e) => {
                    console.log('Messages: Send button clicked');
                    e.preventDefault();
                    this.sendMessage(e);
                });
            }
        } else {
            console.log('Messages: Message form not found');
        }

        // Message input typing indicator and Enter key
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            console.log('Messages: Found message input, adding listeners');
            messageInput.addEventListener('input', () => this.handleTyping());
            
            // Add Enter key listener
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    console.log('Messages: Enter key pressed in message input');
                    e.preventDefault();
                    this.sendMessage(e);
                }
            });
        } else {
            console.log('Messages: Message input not found');
        }

        // Conversation search
        const conversationSearch = document.getElementById('conversation-search');
        if (conversationSearch) {
            conversationSearch.addEventListener('input', (e) => this.searchConversations(e.target.value));
        }

        // New message modal
        const newMessageForm = document.getElementById('new-message-form');
        if (newMessageForm) {
            newMessageForm.addEventListener('submit', (e) => this.startNewConversation(e));
        }

        // User search in new message modal
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => this.searchUsers(e.target.value));
        }
        
        console.log('Messages: Event listeners setup complete');
    }

    loadConversations() {
        const conversationsList = document.getElementById('conversations-list');
        if (!conversationsList) return;

        if (this.conversations.length === 0) {
            conversationsList.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet</p>
                    <button class="btn btn-primary btn-sm" onclick="messageApp.showNewMessageModal()">
                        Start Conversation
                    </button>
                </div>
            `;
            return;
        }

        // Sort conversations by last activity
        const sortedConversations = [...this.conversations].sort((a, b) => 
            new Date(b.lastActivity) - new Date(a.lastActivity)
        );

        conversationsList.innerHTML = sortedConversations.map(conversation => {
            const otherParticipant = this.getOtherParticipant(conversation);
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            const timeAgo = this.getTimeAgo(lastMessage.timestamp);

            return `
                <div class="conversation-item ${conversation.unreadCount > 0 ? 'unread' : ''}" 
                     onclick="messageApp.selectConversation('${conversation.id}')">
                    <div class="conversation-avatar">
                        <img src="${otherParticipant.profile.avatar}" alt="${otherParticipant.fullName}">
                        ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <div class="conversation-name">${otherParticipant.fullName}</div>
                            <div class="conversation-time">${timeAgo}</div>
                        </div>
                        <div class="conversation-preview">
                            ${lastMessage.senderId === talentSync.currentUser.id ? 'You: ' : ''}${this.truncateText(lastMessage.content, 40)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getOtherParticipant(conversation) {
        const currentUserId = talentSync.currentUser.uid || talentSync.currentUser.id;
        const otherParticipantId = conversation.participants.find(id => id != currentUserId);
        
        // Try to find user by both id and uid using loose equality
        let otherUser = this.users.find(u => u.id == otherParticipantId || u.uid == otherParticipantId);
        
        if (!otherUser) {
            // Return a placeholder user
            otherUser = {
                id: otherParticipantId,
                uid: otherParticipantId,
                fullName: 'Unknown User',
                email: 'unknown@example.com',
                role: 'user',
                profile: { 
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                    bio: 'User profile not available'
                }
            };
        }
        
        return otherUser;
    }

    selectConversation(conversationId) {
        console.log('Messages: Selecting conversation:', conversationId);
        
        this.activeConversation = this.conversations.find(c => c.id === conversationId);
        if (!this.activeConversation) {
            console.log('Messages: Conversation not found');
            return;
        }

        // Mark messages as read
        this.activeConversation.messages.forEach(message => {
            if (message.senderId !== talentSync.currentUser.id) {
                message.read = true;
            }
        });

        // Update unread count
        this.activeConversation.unreadCount = 0;

        // Save updated conversations
        this.saveConversations();

        // Show chat interface
        document.getElementById('no-conversation').style.display = 'none';
        document.getElementById('active-chat').style.display = 'flex';

        // Update chat header
        const otherParticipant = this.getOtherParticipant(this.activeConversation);
        document.getElementById('chat-user-avatar').src = otherParticipant.profile.avatar;
        document.getElementById('chat-user-name').textContent = otherParticipant.fullName;
        document.getElementById('chat-user-title').textContent = otherParticipant.role || 'User';

        // Load messages
        this.loadMessages();

        // Refresh conversations list to update unread indicators
        this.loadConversations();
        
        // Re-setup event listeners for the now-visible message form
        console.log('Messages: Re-setting up event listeners for active chat');
        setTimeout(() => {
            this.setupMessageFormListeners();
        }, 100);
    }

    setupMessageFormListeners() {
        console.log('Messages: Setting up message form listeners...');
        
        // Setup message form submit listener
        const messageForm = document.getElementById('message-form');
        if (messageForm) {
            console.log('Messages: Found message form, adding submit listener');
            
            // Remove existing listeners by cloning the form
            const newForm = messageForm.cloneNode(true);
            messageForm.parentNode.replaceChild(newForm, messageForm);
            
            newForm.addEventListener('submit', (e) => {
                console.log('Messages: Form submit event triggered');
                e.preventDefault();
                this.sendMessage(e);
            });
        }
        
        // Setup send button click listener
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            console.log('Messages: Found send button, adding click listener');
            sendBtn.addEventListener('click', (e) => {
                console.log('Messages: Send button clicked');
                e.preventDefault();
                this.sendMessage(e);
            });
        }
        
        // Setup message input Enter key listener
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            console.log('Messages: Found message input, adding keypress listener');
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    console.log('Messages: Enter key pressed in message input');
                    e.preventDefault();
                    this.sendMessage(e);
                }
            });
            
            // Focus the input
            messageInput.focus();
        }
        
        console.log('Messages: Message form listeners setup complete');
    }

    loadMessages() {
        if (!this.activeConversation) return;

        const messagesList = document.getElementById('messages-list');
        
        messagesList.innerHTML = this.activeConversation.messages.map(message => {
            const sender = this.users.find(u => u.id === message.senderId) || talentSync.currentUser;
            const isSent = message.senderId === talentSync.currentUser.id;
            
            const messageTime = new Date(message.timestamp);
            
            return `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    ${!isSent ? `
                        <div class="message-avatar">
                            <img src="${sender.profile.avatar}" alt="${sender.fullName}">
                        </div>
                    ` : ''}
                    <div class="message-bubble">
                        <div class="message-content">${message.content}</div>
                        <div class="message-time">${messageTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    async sendMessage(event) {
        event.preventDefault();
        
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        
        if (!content || !this.activeConversation) {
            console.log('Messages: Cannot send message - no content or active conversation');
            return;
        }

        console.log('Messages: Sending message:', content);

        const newMessage = {
            senderId: talentSync.currentUser.uid || talentSync.currentUser.id,
            conversationId: this.activeConversation.id,
            content: content,
            timestamp: new Date().toISOString(),
            read: false
        };

        // Show sending indicator
        messageInput.disabled = true;
        messageInput.placeholder = 'Sending...';

        try {
            if (talentSync.useFirebase && firebaseService) {
                console.log('Messages: Using Firebase to send message');
                // Save to Firebase with retry logic
                const result = await firebaseService.executeWithRetry(async () => {
                    return await firebaseService.saveMessage(newMessage);
                });
                
                if (result.success) {
                    console.log('Messages: Message sent successfully via Firebase');
                    // Clear input
                    messageInput.value = '';
                    messageInput.disabled = false;
                    messageInput.placeholder = 'Type your message...';
                    talentSync.showToast('Message sent!', 'success');
                    
                    // Messages will be updated via real-time listener
                } else {
                    console.error('Messages: Failed to send message via Firebase:', result.error);
                    messageInput.disabled = false;
                    messageInput.placeholder = 'Type your message...';
                    talentSync.showToast('Failed to send message. Please try again.', 'error');
                }
            } else {
                console.log('Messages: Using localStorage fallback to send message');
                // Fallback to localStorage
                newMessage.id = `msg_${Date.now()}`;
                newMessage.read = true;
                
                // Add message to conversation
                this.activeConversation.messages.push(newMessage);
                this.activeConversation.lastActivity = newMessage.timestamp;

                // Clear input
                messageInput.value = '';
                messageInput.disabled = false;
                messageInput.placeholder = 'Type your message...';

                // Save conversations
                this.saveConversations();

                // Reload messages and conversations
                this.loadMessages();
                this.loadConversations();

                // Show success feedback
                talentSync.showToast('Message sent!', 'success');
                console.log('Messages: Message sent successfully via localStorage');
            }
        } catch (error) {
            console.error('Messages: Error sending message:', error);
            messageInput.disabled = false;
            messageInput.placeholder = 'Type your message...';
            talentSync.showToast('Failed to send message. Please try again.', 'error');
        }
    }

    handleTyping() {
        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Show typing indicator
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
        }

        // Hide typing indicator after 2 seconds
        this.typingTimeout = setTimeout(() => {
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
            }
        }, 2000);
    }

    searchConversations(query) {
        if (!query.trim()) {
            this.loadConversations();
            return;
        }

        const filteredConversations = this.conversations.filter(conversation => {
            const otherParticipant = this.getOtherParticipant(conversation);
            return otherParticipant.fullName.toLowerCase().includes(query.toLowerCase());
        });

        // Display filtered conversations
        const conversationsList = document.getElementById('conversations-list');
        conversationsList.innerHTML = filteredConversations.map(conversation => {
            const otherParticipant = this.getOtherParticipant(conversation);
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            const timeAgo = this.getTimeAgo(lastMessage.timestamp);

            return `
                <div class="conversation-item ${conversation.unreadCount > 0 ? 'unread' : ''}" 
                     onclick="messageApp.selectConversation('${conversation.id}')">
                    <div class="conversation-avatar">
                        <img src="${otherParticipant.profile.avatar}" alt="${otherParticipant.fullName}">
                        ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-header">
                            <div class="conversation-name">${otherParticipant.fullName}</div>
                            <div class="conversation-time">${timeAgo}</div>
                        </div>
                        <div class="conversation-preview">
                            ${lastMessage.senderId === talentSync.currentUser.id ? 'You: ' : ''}${this.truncateText(lastMessage.content, 40)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showNewMessageModal() {
        document.getElementById('new-message-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeNewMessageModal() {
        document.getElementById('new-message-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Clear form
        document.getElementById('new-message-form').reset();
        document.getElementById('user-search-results').innerHTML = '';
        document.getElementById('selected-user-id').value = '';
    }

    searchUsers(query) {
        const resultsContainer = document.getElementById('user-search-results');
        
        if (!query.trim()) {
            resultsContainer.innerHTML = '';
            return;
        }

        const filteredUsers = this.users.filter(user => 
            user.id !== talentSync.currentUser.id &&
            (user.fullName.toLowerCase().includes(query.toLowerCase()) ||
             user.email.toLowerCase().includes(query.toLowerCase()))
        );

        resultsContainer.innerHTML = filteredUsers.map(user => `
            <div class="user-search-result" onclick="messageApp.selectUser(${user.id}, '${user.fullName}')">
                <img src="${user.profile.avatar}" alt="${user.fullName}">
                <div class="user-info">
                    <div class="user-name">${user.fullName}</div>
                    <div class="user-role">${user.role}</div>
                </div>
            </div>
        `).join('');
    }

    selectUser(userId, userName) {
        document.getElementById('selected-user-id').value = userId;
        document.getElementById('user-search').value = userName;
        document.getElementById('user-search-results').innerHTML = '';
    }

    startNewConversation(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userId = parseInt(formData.get('userId'));
        const subject = formData.get('subject');
        const messageContent = formData.get('message');
        
        if (!userId || !messageContent.trim()) {
            talentSync.showToast('Please select a user and enter a message', 'error');
            return;
        }

        // Check if conversation already exists
        let conversation = this.conversations.find(c => 
            c.participants.includes(userId) && c.participants.includes(talentSync.currentUser.id)
        );
        
        if (!conversation) {
            // Create new conversation
            conversation = {
                id: `conv_${talentSync.currentUser.id}_${userId}`,
                participants: [talentSync.currentUser.id, userId],
                messages: [],
                lastActivity: new Date().toISOString(),
                unreadCount: 0
            };
            this.conversations.push(conversation);
        }

        // Add message
        const newMessage = {
            id: `msg_${Date.now()}`,
            senderId: talentSync.currentUser.id,
            content: subject ? `Subject: ${subject}\n\n${messageContent}` : messageContent,
            timestamp: new Date().toISOString(),
            read: true
        };

        conversation.messages.push(newMessage);
        conversation.lastActivity = newMessage.timestamp;

        // Save conversations
        this.saveConversations();

        // Close modal and refresh
        this.closeNewMessageModal();
        this.loadConversations();
        this.selectConversation(conversation.id);
        
        talentSync.showToast('Message sent successfully!', 'success');
    }

    showAttachmentOptions() {
        document.getElementById('attachment-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeAttachmentModal() {
        document.getElementById('attachment-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    selectAttachmentType(type) {
        const fileInput = document.getElementById('file-input');
        const fileUploadArea = document.getElementById('file-upload-area');
        
        switch(type) {
            case 'image':
                fileInput.accept = 'image/*';
                break;
            case 'document':
                fileInput.accept = '.pdf,.doc,.docx,.txt';
                break;
            case 'video':
                fileInput.accept = 'video/*';
                break;
        }
        
        fileUploadArea.style.display = 'block';
        fileInput.click();
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.sendFileMessage(file);
            }
        };
    }

    sendFileMessage(file) {
        if (!this.activeConversation) return;
        
        // In a real app, you'd upload the file to a server
        // For demo purposes, we'll create a placeholder URL
        const fileUrl = URL.createObjectURL(file);
        
        const newMessage = {
            id: `msg_${Date.now()}`,
            senderId: talentSync.currentUser.id,
            content: fileUrl,
            fileName: file.name,
            fileType: file.type,
            timestamp: new Date().toISOString(),
            read: true,
            isFile: true
        };

        this.activeConversation.messages.push(newMessage);
        this.activeConversation.lastActivity = newMessage.timestamp;

        this.saveConversations();
        this.loadMessages();
        this.loadConversations();
        this.closeAttachmentModal();
        
        talentSync.showToast('File sent successfully!', 'success');
    }

    showEmojiPicker() {
        talentSync.showToast('Emoji picker coming soon!', 'info');
    }

    showUserProfile() {
        console.log('Messages: Showing user profile');
        
        if (!this.activeConversation) {
            console.log('Messages: No active conversation for profile display');
            talentSync.showToast('Please select a conversation first', 'warning');
            return;
        }
        
        const otherParticipant = this.getOtherParticipant(this.activeConversation);
        console.log('Messages: Other participant:', otherParticipant);
        
        if (!otherParticipant) {
            console.log('Messages: Could not find other participant');
            talentSync.showToast('Could not load user profile', 'error');
            return;
        }
        
        const modalHTML = `
            <div class="modal user-profile-modal">
                <div class="modal-header">
                    <h2 class="modal-title">${otherParticipant.fullName}</h2>
                    <button class="modal-close" onclick="messageApp.closeUserProfileModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="user-profile-content">
                        <div class="profile-header">
                            <img src="${otherParticipant.profile.avatar}" alt="${otherParticipant.fullName}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
                            <div class="profile-info" style="margin-left: 1rem;">
                                <h3>${otherParticipant.fullName}</h3>
                                <p style="color: var(--text-secondary); text-transform: capitalize;">${otherParticipant.role}</p>
                                <p style="color: var(--text-muted); font-size: 0.9rem;">${otherParticipant.email}</p>
                            </div>
                        </div>
                        <div class="profile-details" style="margin-top: 2rem;">
                            <h4 style="margin-bottom: 0.5rem;">About</h4>
                            <p style="color: var(--text-secondary); line-height: 1.6;">${otherParticipant.profile.bio || 'No bio available'}</p>
                            ${otherParticipant.profile.skills && otherParticipant.profile.skills.length > 0 ? `
                                <h4 style="margin: 1.5rem 0 0.5rem 0;">Skills</h4>
                                <div class="skills-list" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                    ${otherParticipant.profile.skills.map(skill => `<span class="skill-tag" style="background: var(--secondary-color); color: var(--text-primary); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem;">${skill}</span>`).join('')}
                                </div>
                            ` : ''}
                            ${otherParticipant.profile.hourlyRate ? `
                                <h4 style="margin: 1.5rem 0 0.5rem 0;">Hourly Rate</h4>
                                <p style="color: var(--primary-color); font-weight: 600; font-size: 1.1rem;">$${otherParticipant.profile.hourlyRate}/hr</p>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('Messages: Showing profile modal');
        talentSync.showModal(modalHTML);
    }

    closeUserProfileModal() {
        talentSync.closeModal();
    }

    toggleChatOptions() {
        console.log('Messages: Showing chat options');
        
        if (!this.activeConversation) {
            talentSync.showToast('Please select a conversation first', 'warning');
            return;
        }
        
        const otherParticipant = this.getOtherParticipant(this.activeConversation);
        
        const modalHTML = `
            <div class="modal chat-options-modal">
                <div class="modal-header">
                    <h2 class="modal-title">Chat Options</h2>
                    <button class="modal-close" onclick="talentSync.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="chat-options-list">
                        <div class="option-item" onclick="messageApp.showUserProfile(); talentSync.closeModal();">
                            <i class="fas fa-user"></i>
                            <div class="option-content">
                                <h4>View Profile</h4>
                                <p>See ${otherParticipant.fullName}'s profile information</p>
                            </div>
                        </div>
                        
                        <div class="option-item" onclick="messageApp.clearConversation()">
                            <i class="fas fa-trash"></i>
                            <div class="option-content">
                                <h4>Clear Conversation</h4>
                                <p>Delete all messages in this conversation</p>
                            </div>
                        </div>
                        
                        <div class="option-item" onclick="messageApp.muteConversation()">
                            <i class="fas fa-bell-slash"></i>
                            <div class="option-content">
                                <h4>Mute Notifications</h4>
                                <p>Stop receiving notifications for this chat</p>
                            </div>
                        </div>
                        
                        <div class="option-item" onclick="messageApp.blockUser()">
                            <i class="fas fa-ban"></i>
                            <div class="option-content">
                                <h4>Block User</h4>
                                <p>Block ${otherParticipant.fullName} from messaging you</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        talentSync.showModal(modalHTML);
    }

    clearConversation() {
        if (!this.activeConversation) return;
        
        if (confirm('Are you sure you want to clear all messages in this conversation? This action cannot be undone.')) {
            this.activeConversation.messages = [];
            this.saveConversations();
            this.loadMessages();
            this.loadConversations();
            talentSync.closeModal();
            talentSync.showToast('Conversation cleared', 'success');
        }
    }

    muteConversation() {
        if (!this.activeConversation) return;
        
        this.activeConversation.muted = !this.activeConversation.muted;
        this.saveConversations();
        talentSync.closeModal();
        
        const status = this.activeConversation.muted ? 'muted' : 'unmuted';
        talentSync.showToast(`Conversation ${status}`, 'success');
    }

    blockUser() {
        if (!this.activeConversation) return;
        
        const otherParticipant = this.getOtherParticipant(this.activeConversation);
        
        if (confirm(`Are you sure you want to block ${otherParticipant.fullName}? They will no longer be able to message you.`)) {
            // In a real app, this would be handled by the backend
            talentSync.closeModal();
            talentSync.showToast(`${otherParticipant.fullName} has been blocked`, 'success');
        }
    }

    // Utility functions
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return messageTime.toLocaleDateString();
    }

    saveConversations() {
        localStorage.setItem(`conversations_${talentSync.currentUser.id}`, JSON.stringify(this.conversations));
    }
}

// Initialize message app when page loads
const messageApp = new MessageApp();

// Make it globally available
window.messageApp = messageApp;
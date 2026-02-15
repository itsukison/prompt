// =============================================================================
// State
// =============================================================================
let currentPage = 'auth';
let onboardingState = {
    displayName: '',
    writingStyle: null,
    writingStyleGuide: null,
};
let currentUserData = {
    name: '',
    email: '',
    styleId: 'professional',
    customStyleText: '',
};

// =============================================================================
// Router
// =============================================================================

function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = page;

        // Page-specific initialization
        if (page === 'settings') {
            loadSettings();
        }
    }
}

// Listen for navigation from main process
if (window.promptOS) {
    window.promptOS.onNavigate((route) => {
        navigateTo(route);
    });
}

// =============================================================================
// Auth Page
// =============================================================================

function initAuthPage() {
    const form = document.getElementById('auth-form');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const submitBtn = document.getElementById('auth-submit');
    const toggleBtn = document.getElementById('auth-toggle');
    const errorEl = document.getElementById('auth-error');
    const titleEl = document.getElementById('auth-title');
    const subtitleEl = document.getElementById('auth-subtitle');

    let isSignUp = false;

    toggleBtn.addEventListener('click', () => {
        isSignUp = !isSignUp;
        titleEl.textContent = isSignUp ? 'Create account' : 'Welcome back';
        subtitleEl.textContent = isSignUp ? 'Start your journey with a free account.' : 'Enter your credentials to access your workspace.';
        submitBtn.textContent = isSignUp ? 'Create Account' : 'Continue';
        toggleBtn.textContent = isSignUp
            ? 'Already have an account? Sign in'
            : "No account? Sign up";
        errorEl.classList.add('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.classList.add('hidden');
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';

        const credentials = {
            email: emailInput.value.trim(),
            password: passwordInput.value,
        };

        try {
            const result = isSignUp
                ? await window.promptOS.auth.signUp(credentials)
                : await window.promptOS.auth.signIn(credentials);

            if (!result.success) {
                errorEl.textContent = result.error;
                errorEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }

            // Navigate based on onboarding status
            if (isSignUp || result.needsOnboarding) {
                navigateTo('onboarding-1');
            } else {
                // User already onboarded - transition happens in main process
                navigateTo('settings');
            }
        } catch (err) {
            errorEl.textContent = 'An unexpected error occurred';
            errorEl.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}

// =============================================================================
// Onboarding Step 1: Name
// =============================================================================

function initOnboardingStep1() {
    const form = document.getElementById('onboarding-1-form');
    const nameInput = document.getElementById('display-name-input');
    const submitBtn = document.getElementById('onboarding-name-submit');

    nameInput.addEventListener('input', () => {
        submitBtn.disabled = !nameInput.value.trim();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const displayName = nameInput.value.trim();
        if (!displayName) return;

        onboardingState.displayName = displayName;
        navigateTo('onboarding-2');
    });
}

// =============================================================================
// Onboarding Step 2: Writing Style
// =============================================================================

function initOnboardingStep2() {
    const styleCards = document.querySelectorAll('#page-onboarding-2 .style-card');
    const customSection = document.getElementById('custom-style-container');
    const customTextarea = document.getElementById('custom-style-input');
    const completeBtn = document.getElementById('complete-onboarding');
    const backBtn = document.getElementById('onboarding-back-btn');

    // Style card selection
    styleCards.forEach(card => {
        card.addEventListener('click', () => {
            // Deselect all
            styleCards.forEach(c => {
                c.classList.remove('border-zinc-500', 'bg-zinc-800');
                c.classList.add('border-zinc-800/50', 'bg-[#1e1e20]');
                const iconContainer = c.querySelector('.icon-container');
                iconContainer.classList.remove('bg-zinc-100', 'text-zinc-950');
                iconContainer.classList.add('bg-zinc-900', 'text-zinc-500');
                c.querySelector('.title').classList.remove('text-zinc-100');
                c.querySelector('.title').classList.add('text-zinc-300');
                c.querySelector('.example')?.classList.remove('text-zinc-300', 'border-zinc-500');
                c.querySelector('.example')?.classList.add('text-zinc-600', 'border-zinc-800');
            });

            // Select this one
            card.classList.remove('border-zinc-800/50', 'bg-[#1e1e20]');
            card.classList.add('border-zinc-500', 'bg-zinc-800');
            const iconContainer = card.querySelector('.icon-container');
            iconContainer.classList.remove('bg-zinc-900', 'text-zinc-500');
            iconContainer.classList.add('bg-zinc-100', 'text-zinc-950');
            card.querySelector('.title').classList.remove('text-zinc-300');
            card.querySelector('.title').classList.add('text-zinc-100');
            card.querySelector('.example')?.classList.remove('text-zinc-600', 'border-zinc-800');
            card.querySelector('.example')?.classList.add('text-zinc-300', 'border-zinc-500');

            onboardingState.writingStyle = card.dataset.style;

            // Show/hide custom section
            if (card.dataset.style === 'custom') {
                customSection.classList.remove('hidden');
                completeBtn.disabled = !customTextarea.value.trim();
            } else {
                customSection.classList.add('hidden');
                onboardingState.writingStyleGuide = null;
                completeBtn.disabled = false;
            }
        });
    });

    // Custom text input handling
    customTextarea.addEventListener('input', () => {
        onboardingState.writingStyleGuide = customTextarea.value.trim();
        if (onboardingState.writingStyle === 'custom') {
            completeBtn.disabled = !customTextarea.value.trim();
        }
    });

    // Back button
    backBtn.addEventListener('click', () => {
        navigateTo('onboarding-1');
    });

    // Complete onboarding
    completeBtn.addEventListener('click', async () => {
        if (!onboardingState.writingStyle) return;

        if (onboardingState.writingStyle === 'custom' && !onboardingState.writingStyleGuide) {
            alert('Please enter your custom style instructions');
            return;
        }

        completeBtn.disabled = true;
        const originalText = completeBtn.innerHTML;
        completeBtn.textContent = 'Setting up...';

        try {
            const result = await window.promptOS.onboarding.complete({
                displayName: onboardingState.displayName,
                writingStyle: onboardingState.writingStyle,
                writingStyleGuide: onboardingState.writingStyleGuide,
            });

            if (!result.success) {
                alert('Failed to complete setup: ' + result.error);
                completeBtn.disabled = false;
                completeBtn.innerHTML = originalText;
            }
            // On success, main process handles window transition
        } catch (err) {
            alert('Failed to complete setup');
            completeBtn.disabled = false;
            completeBtn.innerHTML = originalText;
        }
    });
}

// =============================================================================
// Settings Page
// =============================================================================

let activeTab = 'general';

function initSettingsPage() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const tabContents = document.querySelectorAll('.settings-tab-content');
    const pageTitle = document.getElementById('settings-page-title');
    const logoutBtn = document.getElementById('logout-btn');

    // Tab switching
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab;
            activeTab = tabId;

            // Update nav items
            navItems.forEach(nav => {
                const icon = nav.querySelector('svg'); // Lucide replaces <i> with <svg>
                if (nav.dataset.tab === tabId) {
                    nav.classList.remove('text-zinc-500', 'hover:bg-zinc-800/40', 'hover:text-zinc-300');
                    nav.classList.add('bg-zinc-800/80', 'text-zinc-100', 'shadow-sm');
                    if (icon) {
                        icon.classList.remove('text-zinc-500');
                        icon.classList.add('text-zinc-100');
                    }
                } else {
                    nav.classList.add('text-zinc-500', 'hover:bg-zinc-800/40', 'hover:text-zinc-300');
                    nav.classList.remove('bg-zinc-800/80', 'text-zinc-100', 'shadow-sm');
                    if (icon) {
                        icon.classList.add('text-zinc-500');
                        icon.classList.remove('text-zinc-100');
                    }
                }
            });

            // Update content
            tabContents.forEach(content => {
                if (content.id === `tab-${tabId}`) {
                    content.classList.remove('hidden');
                    content.classList.add('animate-fade-in');
                } else {
                    content.classList.add('hidden');
                }
            });

            // Update title
            pageTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
        });
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        const originalContent = logoutBtn.innerHTML;
        logoutBtn.textContent = 'Logging out...';

        try {
            await window.promptOS.auth.signOut();
            // Main process handles transition to auth mode
        } catch (err) {
            alert('Failed to log out');
            logoutBtn.disabled = false;
            logoutBtn.innerHTML = originalContent;
        }
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('settings-sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    // Check local storage for preference
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
        sidebar.dataset.collapsed = 'true';
        sidebar.classList.remove('w-[260px]');
        sidebar.classList.add('w-[80px]');
    }

    sidebarToggle.addEventListener('click', () => {
        const collapsed = sidebar.dataset.collapsed === 'true';
        const newState = !collapsed;

        sidebar.dataset.collapsed = newState.toString();

        // Manual width class toggle for smooth transition if needed, 
        // though group-data attributes might handle inner content, 
        // the width itself needs separate handling or data attribute selector in CSS?
        // Ah, I used `w-[260px]` in HTML. I need to toggle that.

        if (newState) {
            sidebar.classList.remove('w-[260px]');
            sidebar.classList.add('w-[80px]');
        } else {
            sidebar.classList.remove('w-[80px]');
            sidebar.classList.add('w-[260px]');
        }

        localStorage.setItem('sidebar-collapsed', newState);
    });

    initSettingsGeneralTab();
}

function initSettingsGeneralTab() {
    // Profile Name Editing
    const editNameBtn = document.getElementById('edit-name-btn');
    const saveNameBtn = document.getElementById('save-name-btn');
    const nameView = document.getElementById('display-name-view');
    const nameEdit = document.getElementById('display-name-edit');
    const nameInput = document.getElementById('settings-display-name');

    editNameBtn.addEventListener('click', () => {
        nameView.classList.add('hidden');
        nameEdit.classList.remove('hidden');
        nameInput.value = currentUserData.name;
        nameInput.focus();
    });

    const saveName = async () => {
        const newName = nameInput.value.trim();
        if (!newName) return;

        saveNameBtn.disabled = true;
        saveNameBtn.textContent = 'Saving...';

        try {
            const result = await window.promptOS.profile.update({
                display_name: newName,
            });

            if (result.success) {
                currentUserData.name = newName;
                document.getElementById('sidebar-name').textContent = newName;
                document.getElementById('sidebar-avatar').textContent = newName.charAt(0).toUpperCase();

                nameView.classList.remove('hidden');
                nameEdit.classList.add('hidden');
            } else {
                alert('Failed to save: ' + result.error);
            }
        } catch (err) {
            alert('Failed to save name');
        } finally {
            saveNameBtn.disabled = false;
            saveNameBtn.textContent = 'Save';
        }
    };

    saveNameBtn.addEventListener('click', saveName);

    // Style Selection in Settings
    const styleCards = document.querySelectorAll('#settings-style-grid .settings-style-card');
    const customContainer = document.getElementById('settings-custom-style-container');
    const customInput = document.getElementById('settings-custom-style-input');
    const saveStyleBtn = document.getElementById('save-style-btn');

    // Helper to update style cards visual state
    const updateStyleVisuals = (selectedStyle) => {
        styleCards.forEach(card => {
            const isSelected = card.dataset.style === selectedStyle;
            const indicator = card.querySelector('.selection-indicator');

            if (isSelected) {
                card.classList.remove('bg-zinc-900/20', 'border-zinc-800/50');
                card.classList.add('bg-zinc-800/40', 'border-zinc-600/50');
                card.querySelector('.title').classList.remove('text-zinc-300');
                card.querySelector('.title').classList.add('text-zinc-100');
                indicator.classList.remove('hidden');
                indicator.classList.add('bg-zinc-100', 'shadow-[0_0_8px_rgba(255,255,255,0.5)]');
            } else {
                card.classList.add('bg-zinc-900/20', 'border-zinc-800/50');
                card.classList.remove('bg-zinc-800/40', 'border-zinc-600/50');
                card.querySelector('.title').classList.add('text-zinc-300');
                card.querySelector('.title').classList.remove('text-zinc-100');
                indicator.classList.add('hidden');
            }
        });

        if (selectedStyle === 'custom') {
            customContainer.classList.remove('hidden');
            document.getElementById('settings-custom-placeholder').classList.add('hidden');
        } else {
            customContainer.classList.add('hidden');
            document.getElementById('settings-custom-placeholder').classList.remove('hidden');
        }
    };

    styleCards.forEach(card => {
        card.addEventListener('click', async () => {
            const style = card.dataset.style;

            // Optimistic update
            updateStyleVisuals(style);

            // If it's custom, we don't save until they type/click save? 
            // Or we save immediately if not custom.
            // For now, let's match the reference impl which updates immediately for presets
            if (style !== 'custom') {
                await window.promptOS.profile.update({ writing_style: style });
                currentUserData.styleId = style;
            } else {
                // Just update local state for custom until saved
                currentUserData.styleId = 'custom';
                customInput.value = currentUserData.customStyleText || '';
            }
        });
    });

    saveStyleBtn.addEventListener('click', async () => {
        const text = customInput.value.trim();
        if (!text) return;

        saveStyleBtn.textContent = 'Saving...';
        saveStyleBtn.disabled = true;

        try {
            await window.promptOS.profile.update({
                writing_style: 'custom',
                writing_style_guide: text
            });
            currentUserData.customStyleText = text;
            saveStyleBtn.textContent = 'Saved!';
            setTimeout(() => {
                saveStyleBtn.textContent = 'Save Custom Style';
                saveStyleBtn.disabled = false;
            }, 1500);
        } catch (err) {
            alert('Failed to save style');
            saveStyleBtn.textContent = 'Save Custom Style';
            saveStyleBtn.disabled = false;
        }
    });
}

async function loadSettings() {
    try {
        // Load profile
        const profileResult = await window.promptOS.profile.get();
        if (profileResult.success) {
            const { display_name, writing_style, writing_style_guide } = profileResult.profile;
            currentUserData.name = display_name || '';
            currentUserData.styleId = writing_style || 'professional';
            currentUserData.customStyleText = writing_style_guide || '';

            // Update Sidebar
            document.getElementById('sidebar-name').textContent = currentUserData.name || 'User';
            if (currentUserData.name) {
                document.getElementById('sidebar-avatar').textContent = currentUserData.name.charAt(0).toUpperCase();
            }

            // Update General Tab Inputs
            document.getElementById('settings-display-name').value = currentUserData.name;
            document.getElementById('settings-custom-style-input').value = currentUserData.customStyleText;

            // Update visuals
            const styleCards = document.querySelectorAll('#settings-style-grid .settings-style-card');
            const customContainer = document.getElementById('settings-custom-style-container');

            styleCards.forEach(card => {
                const isSelected = card.dataset.style === currentUserData.styleId;
                const indicator = card.querySelector('.selection-indicator');

                if (isSelected) {
                    card.classList.remove('bg-zinc-900/20', 'border-zinc-800/50');
                    card.classList.add('bg-zinc-800/40', 'border-zinc-600/50');
                    card.querySelector('.title').classList.remove('text-zinc-300');
                    card.querySelector('.title').classList.add('text-zinc-100');
                    indicator.classList.remove('hidden');
                    indicator.classList.add('bg-zinc-100', 'shadow-[0_0_8px_rgba(255,255,255,0.5)]');
                } else {
                    card.classList.add('bg-zinc-900/20', 'border-zinc-800/50');
                    card.classList.remove('bg-zinc-800/40', 'border-zinc-600/50');
                    card.querySelector('.title').classList.add('text-zinc-300');
                    card.querySelector('.title').classList.remove('text-zinc-100');
                    indicator.classList.add('hidden');
                }
            });

            if (currentUserData.styleId === 'custom') {
                customContainer.classList.remove('hidden');
                document.getElementById('settings-custom-placeholder').classList.add('hidden');
            } else {
                customContainer.classList.add('hidden');
                document.getElementById('settings-custom-placeholder').classList.remove('hidden');
            }
        }

        // Load usage stats
        const statsResult = await window.promptOS.usage.getStats();
        if (statsResult.success) {
            const { tokens_used, tokens_remaining, subscription_tier } = statsResult.stats;
            const total = tokens_used + tokens_remaining;
            const percentage = total > 0 ? (tokens_used / total) * 100 : 0;

            document.getElementById('usage-val').textContent = `${tokens_used.toLocaleString()} / ${total.toLocaleString()}`;
            document.getElementById('usage-progress-bar').style.width = `${percentage}%`;

            // Update subscription tier in sidebar
            const tierLabel = subscription_tier === 'pro' ? 'Pro Plan' : 'Free Plan';
            const sidebarTier = document.getElementById('sidebar-tier');
            if (sidebarTier) {
                sidebarTier.textContent = tierLabel;
            }

            // Update billing tab
            const billingTier = document.getElementById('billing-tier');
            if (billingTier) {
                billingTier.textContent = tierLabel;
            }
        }

        // Load session for email
        const sessionResult = await window.promptOS.auth.getSession();
        if (sessionResult.success && sessionResult.session) {
            currentUserData.email = sessionResult.session.user.email || '';
            const accountEmail = document.getElementById('account-email');
            if (accountEmail) {
                accountEmail.textContent = currentUserData.email;
            }
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
}

// =============================================================================
// Initialize
// =============================================================================

function initApp() {
    // Initialize Lucide icons (loaded via CDN)
    if (window.lucide) {
        window.lucide.createIcons();
    }

    initAuthPage();
    initOnboardingStep1();
    initOnboardingStep2();
    initSettingsPage();

    // Check if we have a session and should show settings
    (async () => {
        try {
            const result = await window.promptOS.auth.getSession();
            if (result.success && result.session) {
                // We have a session, check profile
                const profileResult = await window.promptOS.profile.get();
                if (profileResult.success && profileResult.profile?.onboarding_completed) {
                    navigateTo('settings');
                } else if (profileResult.success) {
                    navigateTo('onboarding-1');
                }
            }
        } catch (err) {
            // Stay on auth page
        }
    })();
}

document.addEventListener('DOMContentLoaded', initApp);


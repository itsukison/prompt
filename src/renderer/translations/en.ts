import { Translation } from './types';

export const en: Translation = {
    onboarding: {
        language: {
            title: 'Choose your language',
            subtitle: 'Select the language for the interface and AI responses.',
        },
        name: {
            title: 'What should we call you?',
            subtitle: 'This helps the AI personalize its responses.',
            placeholder: 'Enter your name',
            next: 'Continue',
        },
        style: {
            title: 'Choose your style',
            subtitle: 'How should the AI respond to you?',
            options: {
                professional: {
                    label: 'Professional',
                    description: 'Clear, polished, and business-appropriate tone.',
                    example: '"I wanted to follow up and confirm next steps."',
                },
                casual: {
                    label: 'Casual',
                    description: 'Friendly, conversational, and approachable.',
                    example: '"Hey! Just checking in about earlier—let me know!"',
                },
                concise: {
                    label: 'Concise',
                    description: 'Direct, minimal, no filler words.',
                    example: '"Following up. Please confirm."',
                },
                creative: {
                    label: 'Creative',
                    description: 'Expressive, varied sentence structure.',
                    example: '"Circling back—I\'ve been mulling it over!"',
                },
                custom: {
                    label: 'Custom Instructions',
                    description: 'Define your own system prompt instructions.',
                    placeholder: 'e.g. Always answer in haikus...',
                    save: 'Save Custom Style',
                },
            },
            next: 'Finish Setup',
        },
        finish: {
            title: 'You\'re all set!',
            subtitle: 'Press the shortcut to start using promptOS.',
            button: 'Start Using promptOS',
        },
    },
    settings: {
        sidebar: {
            general: 'General',
            account: 'Account',
            memory: 'Memory',
            billing: 'Billing',
            shortcuts: 'Shortcuts',
            sign_out: 'Sign out',
        },
        tabs: {
            general: {
                title: 'General',
                description: 'Manage your workspace preferences and settings.',
            },
            account: {
                title: 'Account',
                description: 'View and manage your account information.',
            },
            memory: {
                title: 'Memory',
                description: 'View and manage information the AI remembers about you.',
            },
            billing: {
                title: 'Billing',
                description: 'Manage your subscription and billing.',
            },
            shortcuts: {
                title: 'Shortcuts',
                description: 'View keyboard shortcuts and get started.',
            },
        },
        general: {
            language: {
                title: 'Language',
                description: 'Select your preferred language.',
            },
            style: {
                title: 'Response Style',
                description: 'Choose how the AI communicates with you.',
            },
            screen_recording: {
                title: 'Screen Recording',
                description: 'Capture your screen to give the AI visual context.',
                label: 'Screen Context',
                sublabel: 'Automatically capture a screenshot when you open the overlay.',
            },
            model: {
                title: 'AI Model',
                description: 'Select the model powering your responses.',
                thinking_mode: 'Thinking mode',
            },
        },
    },
    account: {
        profile: {
            title: 'Profile',
            name: {
                label: 'Name',
                description: 'Used for email sign-offs',
                not_set: 'Not set',
                edit: 'Edit',
                save: 'Save',
            },
        },
        info: {
            title: 'Account Information',
            email: 'Email',
            status: {
                label: 'Account Status',
                active: 'Active',
            },
        },
        security: {
            title: 'Security',
            description: 'Password management is handled through your authentication provider.',
        },
    },
    memory: {
        enable: {
            title: 'Memory System',
            subtitle: 'Enable Memory',
            description: 'Allow the AI to remember facts about you',
        },
        capacity: {
            title: 'Capacity',
            reached: 'Maximum reached. Delete a memory to add more.',
        },
        list: {
            title: 'What I Know About You',
            add_button: 'Add',
            empty: {
                title: 'No memories saved yet',
                description: 'Add facts manually or let the AI learn about you over time',
            },
            auto: 'Auto-learned',
            manual: 'Manual',
            edit: 'Edit',
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            placeholder: "Enter a fact about yourself (e.g., 'My name is Alex' or 'I prefer casual communication')",
        },
    },
    billing: {
        current_plan: {
            title: 'Current Plan',
            free: 'Free Plan',
            pro: 'Pro Plan',
            current_badge: 'Current',
            upgrade_button: 'Upgrade to Pro',
        },
        benefits: {
            title: 'Pro Plan Benefits',
            features: ['1,000,000 tokens per month', 'Priority support', 'Advanced writing styles'],
        },
        usage: {
            title: 'Current Usage',
            tokens: {
                label: 'Monthly Tokens',
                reset: 'Resets in 14 days',
            },
            fast_requests: {
                label: 'Fast Requests',
                limit: 'Daily limit',
            },
        },
    },
    shortcuts: {
        title: 'Keyboard Shortcuts',
        description: 'Use these shortcuts anywhere in your system to quickly access PromptOS.',
    },
    overlay: {
        placeholder: 'Ask AI...',
        refine: 'Refine',
        insert: 'Insert',
        context: 'Context',
        screen_permission: {
            title: 'Screen Recording required',
            description: 'Enable promptOS in System Settings → Privacy & Security → Screen Recording',
            button: 'Open System Settings →',
        },
    },
};

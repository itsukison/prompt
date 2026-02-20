export interface Translation {
    onboarding: {
        language: {
            title: string;
            subtitle: string;
        };
        name: {
            title: string;
            subtitle: string;
            placeholder: string;
            next: string;
        };
        style: {
            title: string;
            subtitle: string;
            options: {
                professional: { label: string; description: string; example: string };
                casual: { label: string; description: string; example: string };
                concise: { label: string; description: string; example: string };
                creative: { label: string; description: string; example: string };
                custom: { label: string; description: string; placeholder: string; save: string };
            };
            next: string;
        };
        finish: {
            title: string;
            subtitle: string;
            button: string;
        };
    };
    settings: {
        sidebar: {
            general: string;
            account: string;
            memory: string;
            billing: string;
            shortcuts: string;
            sign_out: string;
        };
        tabs: {
            general: {
                title: string;
                description: string;
            };
            account: {
                title: string;
                description: string;
            };
            memory: {
                title: string;
                description: string;
            };
            billing: {
                title: string;
                description: string;
            };
            shortcuts: {
                title: string;
                description: string;
            };
        };
        general: {
            language: {
                title: string;
                description: string;
            };
            style: {
                title: string;
                description: string;
            };
            screen_recording: {
                title: string;
                description: string;
                label: string;
                sublabel: string;
            };
            model: {
                title: string;
                description: string;
                thinking_mode: string;
            };
        };
    };
    account: {
        profile: {
            title: string;
            name: { label: string; description: string; not_set: string; edit: string; save: string; };
        };
        info: {
            title: string;
            email: string;
            status: { label: string; active: string; };
        };
        security: {
            title: string;
            description: string;
        };
    };
    memory: {
        enable: { title: string; subtitle: string; description: string; };
        capacity: { title: string; reached: string; };
        list: {
            title: string;
            add_button: string;
            empty: { title: string; description: string; };
            auto: string;
            manual: string;
            edit: string;
            save: string;
            cancel: string;
            delete: string;
            placeholder: string;
        };
    };
    billing: {
        plans: {
            free: string;
            pro: string;
            power: string;
            features: {
                free: string[];
                pro: string[];
                power: string[];
            }
        };
        actions: {
            upgrade_to: string;
            switch_to: string;
            cancel_subscription: string;
            opening_checkout: string;
            opening_portal: string;
        };
        interval: {
            monthly: string;
            annual: string;
            billed_monthly: string;
            billed_annually: string;
            billed_annually_total: string;
        };
        notices: {
            checking: string;
            current: string;
            cancelling: string;
            renews: string;
            resets_on_1st: string;
            resets_on_date: string;
            access_until: string;
            take_effect_at_period_end: string;
            subscription_cancelled: string;
            subscription_ending_on: string;
        };
        current_plan: { title: string; free: string; pro: string; current_badge: string; upgrade_button: string; };
        benefits: { title: string; features: string[]; };
        usage: {
            title: string;
            generations: string;
            tokens: { label: string; reset: string; };
            fast_requests: { label: string; limit: string; };
        };
    };
    shortcuts: {
        title: string;
        description: string;
    };
    overlay: {
        placeholder: string;
        refine: string;
        insert: string;
        context: string;
        screen_permission: {
            title: string;
            description: string;
            button: string;
        };
        status: {
            analyzing: string;
            writing: string;
            server_busy: string;
        };
    };
};

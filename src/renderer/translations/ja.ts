import { Translation } from './types';

export const ja: Translation = {
    onboarding: {
        language: {
            title: '言語を選択してください',
            subtitle: 'インターフェースとAIの応答に使用する言語を選択します。',
        },
        name: {
            title: 'お名前を教えてください',
            subtitle: 'AIの応答をパーソナライズするために使用します。',
            placeholder: '名前を入力',
            next: '次へ',
        },
        style: {
            title: 'スタイルを選択',
            subtitle: 'AIにどのような応答スタイルを期待しますか？',
            options: {
                professional: {
                    label: 'プロフェッショナル',
                    description: '明確で洗練された、ビジネスに適したトーン。',
                    example: '「次のステップについて確認させていただきたく存じます。」',
                },
                casual: {
                    label: 'カジュアル',
                    description: 'フレンドリーで会話的、親しみやすいトーン。',
                    example: '「ねえ！さっきの件どうなったか教えて！」',
                },
                concise: {
                    label: '簡潔',
                    description: '直接的で最小限。余計な言葉を省く。',
                    example: '「確認をお願いします。」',
                },
                creative: {
                    label: 'クリエイティブ',
                    description: '表現豊かで変化に富んだ文章構成。',
                    example: '「改めて考えてみたのですが、素晴らしいアイデアが浮かびました！」',
                },
                custom: {
                    label: 'カスタム指示',
                    description: '独自のシステムプロンプト指示を定義します。',
                    placeholder: '例: 常に俳句で答えてください...',
                    save: 'カスタムスタイルを保存',
                },
            },
            next: 'セットアップ完了',
        },
        finish: {
            title: '準備完了です！',
            subtitle: 'ショートカットキーを押してpromptOSを使い始めましょう。',
            button: 'promptOSを開始',
        },
    },
    settings: {
        sidebar: {
            general: '一般',
            account: 'アカウント',
            memory: 'メモリ',
            billing: '請求',
            shortcuts: 'ショートカット',
            sign_out: 'サインアウト',
        },
        tabs: {
            general: {
                title: '一般',
                description: 'ワークスペースの設定と環境設定を管理します。',
            },
            account: {
                title: 'アカウント',
                description: 'アカウント情報を確認・管理します。',
            },
            memory: {
                title: 'メモリ',
                description: 'AIが記憶しているあなたに関する情報を確認・管理します。',
            },
            billing: {
                title: '請求',
                description: 'サブスクリプションと請求情報を管理します。',
            },
            shortcuts: {
                title: 'ショートカット',
                description: 'キーボードショートカットを確認します。',
            },
        },
        general: {
            language: {
                title: '言語',
                description: '使用する言語を選択してください。',
            },
            style: {
                title: '応答スタイル',
                description: 'AIとのコミュニケーションスタイルを選択します。',
            },
            screen_recording: {
                title: '画面録画',
                description: '画面をキャプチャしてAIに視覚的なコンテキストを提供します。',
                label: '画面コンテキスト',
                sublabel: 'オーバーレイを開くときに自動的にスクリーンショットをキャプチャします。',
            },
            model: {
                title: 'AIモデル',
                description: '応答に使用するモデルを選択します。',
                thinking_mode: '思考モード',
            },
        },
    },
    account: {
        profile: {
            title: 'プロフィール',
            name: {
                label: '名前',
                description: 'メールの署名などに使用されます',
                not_set: '未設定',
                edit: '編集',
                save: '保存',
            },
        },
        info: {
            title: 'アカウント情報',
            email: 'メールアドレス',
            status: {
                label: 'アカウントステータス',
                active: '有効',
            },
        },
        security: {
            title: 'セキュリティ',
            description: 'パスワード管理は認証プロバイダーを通じて行われます。',
        },
    },
    memory: {
        enable: {
            title: 'メモリシステム',
            subtitle: 'メモリを有効化',
            description: 'AIがあなたに関する事実を記憶することを許可します',
        },
        capacity: {
            title: '容量',
            reached: '上限に達しました。追加するにはメモリを削除してください。',
        },
        list: {
            title: '記憶している情報',
            add_button: '追加',
            empty: {
                title: '保存されたメモリはありません',
                description: '手動で事実を追加するか、AIが学習するのを待ちましょう',
            },
            auto: '自動学習',
            manual: '手動',
            edit: '編集',
            save: '保存',
            cancel: 'キャンセル',
            delete: '削除',
            placeholder: "あなたに関する事実を入力してください（例：「私の名前はアレックスです」や「カジュアルな会話を好みます」など）",
        },
    },
    billing: {
        current_plan: {
            title: '現在のプラン',
            free: 'フリープラン',
            pro: 'プロプラン',
            current_badge: '現在のプラン',
            upgrade_button: 'プロプランにアップグレード',
        },
        benefits: {
            title: 'プロプランの特典',
            features: ['月間1,000,000トークン', '優先サポート', '高度な文章スタイル'],
        },
        usage: {
            title: '現在の使用状況',
            tokens: {
                label: '月間トークン',
                reset: '14日後にリセット',
            },
            fast_requests: {
                label: '高速リクエスト',
                limit: '1日の制限',
            },
        },
    },
    shortcuts: {
        title: 'キーボードショートカット',
        description: 'システム上のどこからでもこれらのショートカットを使用してPromptOSにアクセスできます。',
    },
    overlay: {
        placeholder: 'AIに質問...',
        refine: '洗練',
        insert: '挿入',
        context: 'コンテキスト',
        screen_permission: {
            title: '画面録画の許可が必要です',
            description: 'システム設定 → プライバシーとセキュリティ → 画面録画 でpromptOSを有効にしてください',
            button: 'システム設定を開く →',
        },
    },
};

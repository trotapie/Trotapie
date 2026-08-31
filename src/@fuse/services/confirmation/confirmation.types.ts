export interface FuseConfirmationConfig {
    title?: string;
    message?: string;
    icon?: {
        show?: boolean;
        name?: string;
        color?:
            | 'primary'
            | 'accent'
            | 'warn'
            | 'basic'
            | 'info'
            | 'success'
            | 'warning'
            | 'error';
    };
    actions?: {
        confirm?: {
            show?: boolean;
            label?: string;
            color?: 'primary' | 'accent' | 'warn' | 'teal';
            fullWidth?: boolean;
        };
        cancel?: {
            show?: boolean;
            label?: string;
        };
    };
    dismissible?: boolean;
}

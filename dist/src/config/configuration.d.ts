declare const _default: () => {
    nodeEnv: string;
    port: number;
    appUrl: string;
    frontendUrl: string;
    database: {
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshSecret: string;
        refreshExpiresIn: string;
    };
    storage: {
        root: string;
        maxFileSizeMb: number;
        allowedExtensions: string;
        thumbnailMaxWidth: number;
        thumbnailMaxHeight: number;
        previewMaxWidth: number;
        previewMaxHeight: number;
    };
    throttle: {
        ttl: number;
        limit: number;
    };
    security: {
        bcryptRounds: number;
        maxLoginAttempts: number;
        lockoutMinutes: number;
    };
    cors: {
        origins: string;
    };
    virusScan: {
        enabled: boolean;
        url: string;
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
    };
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
    };
    logging: {
        level: string;
        dir: string;
    };
};
export default _default;

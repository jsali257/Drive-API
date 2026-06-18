"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
BigInt.prototype.toJSON = function () {
    return this.toString();
};
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const compression = require("compression");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'verbose', 'debug'],
    });
    const config = app.get(config_1.ConfigService);
    const port = config.get('PORT', 3001);
    const frontendUrl = config.get('FRONTEND_URL', 'http://localhost:3000');
    const nodeEnv = config.get('NODE_ENV', 'development');
    app.use((0, helmet_1.default)({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                scriptSrc: ["'self'", "'unsafe-inline'"],
            },
        },
    }));
    app.use(compression());
    app.enableCors({
        origin: (origin, callback) => {
            const allowed = config
                .get('CORS_ORIGINS', frontendUrl)
                .split(',')
                .map((o) => o.trim());
            if (!origin || allowed.includes(origin) || nodeEnv === 'development') {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
        exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const reflector = app.get(core_1.Reflector);
    app.useGlobalInterceptors(new common_1.ClassSerializerInterceptor(reflector), new logging_interceptor_1.LoggingInterceptor());
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    if (nodeEnv !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('RGV911 Drive API')
            .setDescription('Self-hosted cloud storage platform — REST API documentation.\n\n' +
            'Authenticate via **JWT Bearer token** or **X-API-Key header**.')
            .setVersion('1.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
            .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
            .addTag('Auth', 'Authentication & authorization')
            .addTag('Files', 'File upload, download & management')
            .addTag('Folders', 'Folder management')
            .addTag('Shares', 'File & folder sharing')
            .addTag('API Keys', 'Developer API key management')
            .addTag('Search', 'Full-text search')
            .addTag('Users', 'User management')
            .addTag('Storage', 'Storage statistics')
            .addTag('System', 'System health & settings')
            .addTag('Logs', 'Audit & activity logs')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
        console.log(`Swagger docs: http://localhost:${port}/api/docs`);
    }
    await app.listen(port);
    console.log(`RGV911 Drive API running on http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map
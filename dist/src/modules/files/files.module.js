"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const config_1 = require("@nestjs/config");
const multer = require("multer");
const path = require("path");
const files_controller_1 = require("./files.controller");
const files_service_1 = require("./files.service");
const storage_engine_service_1 = require("./storage-engine.service");
const thumbnail_service_1 = require("./thumbnail.service");
const auth_module_1 = require("../auth/auth.module");
const file_filter_util_1 = require("../../common/utils/file-filter.util");
let FilesModule = class FilesModule {
};
exports.FilesModule = FilesModule;
exports.FilesModule = FilesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            platform_express_1.MulterModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    storage: multer.diskStorage({
                        destination: (req, file, cb) => {
                            const tempDir = path.join(config.get('storage.root') ?? 'D:\\Storage', 'temp');
                            cb(null, tempDir);
                        },
                        filename: (req, file, cb) => {
                            const unique = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
                            cb(null, unique);
                        },
                    }),
                    fileFilter: file_filter_util_1.multerFileFilter,
                    limits: {
                        fileSize: (config.get('storage.maxFileSizeMb') ?? 5000) * 1024 * 1024,
                    },
                }),
            }),
        ],
        controllers: [files_controller_1.FilesController],
        providers: [files_service_1.FilesService, storage_engine_service_1.StorageEngineService, thumbnail_service_1.ThumbnailService],
        exports: [files_service_1.FilesService, storage_engine_service_1.StorageEngineService],
    })
], FilesModule);
//# sourceMappingURL=files.module.js.map
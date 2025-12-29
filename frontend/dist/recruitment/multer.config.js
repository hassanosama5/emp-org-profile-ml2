"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerConfig = void 0;
const multer_1 = require("multer");
const common_1 = require("@nestjs/common");
exports.multerConfig = {
    storage: (0, multer_1.diskStorage)({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
            const fileExtension = file.originalname.split('.').pop();
            const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const filename = `${uniqueSuffix}.${fileExtension}`;
            cb(null, filename);
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new common_1.BadRequestException('Invalid file type'), false);
        }
    },
};
//# sourceMappingURL=multer.config.js.map
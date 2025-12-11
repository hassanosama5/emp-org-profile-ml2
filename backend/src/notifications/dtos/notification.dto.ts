export class CreateNotificationDto {
  to: string;
  type: string;
  message: string;
  relatedModule?: string;
  relatedId?: string;
}

export class NotificationResponseDto {
  _id: string;
  to: string;
  type: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}
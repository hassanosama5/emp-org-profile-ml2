import { IsEnum, IsNotEmpty } from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';

export class UploadDocumentDto {
  @IsNotEmpty()
  @IsEnum(DocumentType)
  documentType: DocumentType;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DocumentType } from '../../common/enums/document-type.enum';

export class UploadDocumentsDto {
  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.ID_CARD,
    description: 'Document type applied to all uploaded files in this request',
  })
  @IsEnum(DocumentType)
  type!: DocumentType;
}

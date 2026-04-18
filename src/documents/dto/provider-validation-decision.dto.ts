import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProviderValidationDecision } from '../../common/enums/provider-validation-decision.enum';

const ALLOWED_PROVIDER_DECISIONS = [
  ProviderValidationDecision.APPROVED,
  ProviderValidationDecision.REJECTED,
] as const;

export class ProviderValidationDecisionDto {
  @ApiProperty({
    enum: [
      ProviderValidationDecision.APPROVED,
      ProviderValidationDecision.REJECTED,
    ],
    example: ProviderValidationDecision.APPROVED,
  })
  @IsIn(ALLOWED_PROVIDER_DECISIONS)
  decision!: ProviderValidationDecision.APPROVED | ProviderValidationDecision.REJECTED;

  @ApiPropertyOptional({
    example: 'The ID card image is blurry. Please upload a clearer scan.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

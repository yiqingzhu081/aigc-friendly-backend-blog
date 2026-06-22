// src/adapters/api/graphql/blog/dto/update-tag.input.ts

import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class UpdateTagInput {
  @Field({ nullable: true, description: '标签名称' })
  @IsOptional()
  @IsString({ message: '标签名称必须是字符串' })
  name?: string;

  @Field({ nullable: true, description: 'URL友好标识' })
  @IsOptional()
  @IsString({ message: 'URL标识必须是字符串' })
  slug?: string;
}
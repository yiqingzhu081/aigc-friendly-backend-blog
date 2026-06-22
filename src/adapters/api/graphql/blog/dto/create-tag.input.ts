// src/adapters/api/graphql/blog/dto/create-tag.input.ts

import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateTagInput {
  @Field({ description: '标签名称' })
  @IsNotEmpty({ message: '标签名称不能为空' })
  @IsString({ message: '标签名称必须是字符串' })
  name!: string;

  @Field({ nullable: true, description: 'URL友好标识' })
  @IsOptional()
  @IsString({ message: 'URL标识必须是字符串' })
  slug?: string;
}
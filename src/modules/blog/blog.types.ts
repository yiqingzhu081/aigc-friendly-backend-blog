import { PostStatus, CommentStatus, LinkStatus } from '@app-types/models/blog.types';

export interface PostView {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  contentHtml: string | null;
  status: PostStatus;
  isTop: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  categoryId: string | null;
  categoryName: string | null;
  tagIds: string[];
  tagNames: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostSnapshot {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  contentHtml: string | null;
  status: PostStatus;
  isTop: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  categoryId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  categoryId?: string | null;
  tagIds?: string[];
  isTop?: boolean;
}

export interface UpdatePostInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  categoryId?: string | null;
  tagIds?: string[];
  isTop?: boolean;
  status?: PostStatus;
}

export interface PostQueryInput {
  keyword?: string;
  categoryId?: string;
  tagId?: string;
  status?: PostStatus;
  isTop?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPostsResult {
  items: PostView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategorySnapshot {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  postCount: number;
  children: CategoryTreeNode[];
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  sortOrder?: number;
}

export interface TagView {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagSnapshot {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagWithCount {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface CreateTagInput {
  name: string;
  slug?: string;
}

export interface UpdateTagInput {
  name?: string;
  slug?: string;
}

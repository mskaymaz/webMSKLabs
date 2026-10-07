export type Permission =
  | 'messages.read'
  | 'messages.reply'
  | 'messages.write'
  | 'messages.delete'
  | 'comments.read'
  | 'comments.approve'
  | 'comments.delete'
  | 'posts.read'
  | 'posts.create'
  | 'posts.write'
  | 'posts.publish'
  | 'media.upload'
  | 'settings.manage';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'SUPPORT';

export const VALID_PERMISSIONS = new Set<Permission>([
  'messages.read',
  'messages.reply',
  'messages.write',
  'messages.delete',
  'comments.read',
  'comments.approve',
  'comments.delete',
  'posts.read',
  'posts.create',
  'posts.write',
  'posts.publish',
  'media.upload',
  'settings.manage'
]);

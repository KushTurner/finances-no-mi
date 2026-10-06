import { createCn } from 'cn/config';

export const cn = createCn({
  extend: {
    theme: {
      text: ['caption', 'title', 'figure', 'pence'],
      shadow: ['control', 'account-card'],
    },
  },
});

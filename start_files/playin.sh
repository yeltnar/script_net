clear;
pm2 kill;
ts-node start.ts start.json;
pm2 status;
# TODO: Optimize Fetching Performance

## Tasks

- [ ] Optimize `getUsersForSidebar` function in `server/controllers/messageController.js` using MongoDB aggregation pipelines
- [ ] Replace multiple queries (distinct, find, countDocuments) with a single efficient aggregation
- [ ] Ensure the optimized function returns the same data structure
- [ ] Test the performance improvements

## Followup Steps

- [ ] Verify the optimized function works correctly
- [ ] Monitor app performance after optimization

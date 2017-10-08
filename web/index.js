
;(async () => {
  
  // Get all running containers with dokku/x in the name
  
  // 1. Find ones older than the MAX_AGE & not whitelisted
  // - Work out their owner (*)
  // - Send them and email, cc-ing openlab-support
  // - Set 'com.dokku-manager.notified' label to today
  
  // 2. Find containers with the label set and the refresh period expired
  // - Stop those containers
  
  
})()

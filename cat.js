const fs = require('fs');

fs.readFile(process.argv[2], function(err, data) {
  process.stdout.write(data);
  process.stdout.write("\n");
});
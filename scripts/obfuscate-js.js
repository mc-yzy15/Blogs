var JavaScriptObfuscator = require('javascript-obfuscator');
var fs = require('fs');
var path = require('path');

hexo.extend.filter.register('after_generate', function () {
  if (hexo.env.cmd !== 'generate') return;

  var files = [
    'js/webinfo-stats.js',
    'js/stats-renderer.js'
  ];

  var options = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    stringArray: true,
    stringArrayThreshold: 0.75,
    rotateStringArray: true,
    selfDefending: true,
    identifierNamesGenerator: 'hexadecimal'
  };

  files.forEach(function (file) {
    var filePath = path.join(hexo.public_dir, file);
    if (!fs.existsSync(filePath)) return;
    try {
      var code = fs.readFileSync(filePath, 'utf8');
      var result = JavaScriptObfuscator.obfuscate(code, options);
      fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
      hexo.log.info('Obfuscated: ' + path.basename(filePath));
    } catch (e) {
      hexo.log.warn('Failed to obfuscate ' + path.basename(filePath) + ': ' + e.message);
    }
  });
});

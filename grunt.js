module.exports = function(grunt) {
  grunt.initConfig({

    // Compile ember templates:
    ember_handlebars: {
      all: {
        // In practice, this could be:
        // src: ['templates/**/*.hbs', 'templates/**/*.handlebars']
        src: ['views/templates/*.hbs'],
        dest: 'views/templates/compiled'
      }
    },

    // Include the templates in your app:
    concat: {
      all: {
        src: ['views/templates/compiled/*.js'],
        dest: 'public/javascripts/templates.js'
      }
    }

  });

// Load the plugin. This assumes you have installed it via NPM.
grunt.loadNpmTasks('grunt-ember-handlebars');
grunt.registerTask('default', ['ember_handlebars', 'concat']);
}
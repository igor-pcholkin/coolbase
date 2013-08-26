var fileSelect = {
   //scope: null,

   handleFileSelect : function (evt) {
      var files = evt.target.files;
      // FileList object
      
      this.scope.fileContents = files[0];

   },

   setup : function (scope) {
      this.scope = scope;
      document.getElementById('files').addEventListener('change', this.handleFileSelect.bind(this), false);
   },
   
};

class Plugin {
    constructor() { }
  
    getName() {
      return "Template Plugin";
    }
  
    getPageContent() {
      return "Add your own elements here";
    }
  
    runCode() {
      console.log("Template Plugin loaded");
    }
  }
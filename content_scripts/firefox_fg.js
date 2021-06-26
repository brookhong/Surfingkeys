function usePdfViewer() {
}
function readText(text, options) {
}

function getContainerName(){
    return new Promise((resolve, reject) => RUNTIME("getContainerName", null, function(response){
        resolve(response.name);
    }));
}

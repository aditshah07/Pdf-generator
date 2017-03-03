var app = app || {};  // app namespace

/*
 * Attaching event listener to the button to generate pdf
 */
document.onreadystatechange = function () {
    if (document.readyState === 'complete') {
        document.getElementById("pdf_generator").onclick = generatePDF;
    }
};

/*
 * Acts as a controller to generate pdf
 */
function generatePDF () {
    new DroneDeploy({version: 1})
        .then(getPlan).catch(reportError)
        .then(getTiles).catch(reportError)
        .then(getAnnotations).catch(reportError)
        .then(getPdfGenerator).catch(reportError)
        .then(sliceResponse).catch(reportError)
        .then(getReader).catch(reportError)
        .then(createPDF).catch(reportError);
}

/*
 * Fetching Data of the currently viewed plan so tiles of the plan can be extracted.
 */
var getPlan = function (api) {
    app.api = api;
    return api.Plans.getCurrentlyViewed();
};

/*
 * Fetching Tile information of the plan and setting zoom to predefined value.
 */
var getTiles = function (plan) {
    app.plan = plan;
    return app.api.Tiles.get({planId: plan.id, layerName: "ortho", zoom: 18});
};

/*
 * Extracting information about annotation from plan.
 */
var getAnnotations = function (data) {
    app.data = data;
    return app.api.Annotations.get(app.plan.id);
};

/*
 * Get a printable PDF report for the map
 */
var getPdfGenerator = function (annotations) {
    return new Promise (function (resolve, reject) {
        var pdfGeneratorUrl = "https://dronedeploy-pdf-generator.herokuapp.com";
        var pdfGeneratorCrud = "POST";
        var xhr = new XMLHttpRequest();

        xhr.open(pdfGeneratorCrud, pdfGeneratorUrl);
        xhr.responseType = 'blob';
        xhr.onload = function (e) {
            if (this.status === 200) {
                // get binary data as a response
                resolve(this.response);
            } else {
                reject(e);
            }
        };

        xhr.send(JSON.stringify({
            tiles: app.data.tiles,
            planGeo: app.plan.geometry,
            zoom_level: 15,
            annotations: annotations
        }));
    });
};

/*
 * Slice the whole response.
 * Response is of the format text/html
 */
var sliceResponse = function (response) {
    return response.slice();
};
/*
 * Reading data as binary string
 */
var getReader = function (binaryData) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onloadend = function () {
            resolve(reader);
        };
        reader.onerror = function (error) {
            reject("error with binaryData", error);
        };
        reader.readAsBinaryString(binaryData);
    });
};
/*
 * Creating a pdf of the binary images
 */
var createPDF = function (reader) {
    base64ImageData = JSON.parse(reader.result);
    var doc = new jsPDF();
    doc.addImage(base64ImageData.image, "JPEG", 0, 0, base64ImageData.new_width, base64ImageData.new_height);
    doc.save("view.pdf");
};

/*
 * General error reporting function
 */
var reportError = function (err) {
    throw new Error(err);
};

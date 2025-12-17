import { jsPDF } from "jspdf"
var font = 'undefined';
var callAddFont = function () {
this.addFileToVFS('Rupee-bold.ttf', font);
this.addFont('Rupee-bold.ttf', 'Rupee', 'bold');
};
jsPDF.API.events.push(['addFonts', callAddFont])

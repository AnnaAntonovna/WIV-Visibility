import {
	IFCWALLSTANDARDCASE,
	IFCSLAB,
	IFCDOOR,
	IFCWINDOW,
	IFCFURNISHINGELEMENT,
	IFCMEMBER,
	IFCPLATE,
} from 'web-ifc';

import { Color } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(0xffffff) });
viewer.grid.setGrid();
viewer.axes.setAxes();

const pickable = viewer.context.items.pickableIfcModels;

let model;

async function loadIfc(url) {
	await viewer.IFC.setWasmPath("../../../");
	model = await viewer.IFC.loadIfcUrl(url);
	model.removeFromParent();

  togglePickable(model, false);

	await viewer.shadowDropper.renderShadow(model.modelID);

	await setupAllCategories();
}

loadIfc('./01.ifc');

const scene = viewer.context.getScene();

window.onmousemove = () => {
  viewer.IFC.selector.prePickIfcItem();
};

window.ondblclick = () => {
  const result = viewer.context.castRayIfc();
  console.log(result);
  if(result === null) return;

  const subset = result.object;
  const index = result.faceIndex;
  const id = viewer.IFC.loader.ifcManager.getExpressId(subset.geometry, index)
  viewer.IFC.loader.ifcManager.removeFromSubset(
    model.modelID,
    [id],
    subset.userData.category
    );

    viewer.context.renderer.postProduction.update();
};

// List of categories names
const categories = {
	IFCWALLSTANDARDCASE,
	IFCSLAB,
	IFCFURNISHINGELEMENT,
	IFCDOOR,
	IFCWINDOW,
	IFCPLATE,
	IFCMEMBER,
};

// Gets the name of a category
function getName(category) {
	const names = Object.keys(categories);
	return names.find(name => categories[name] === category);
}

// Gets all the items of a category
async function getAll(category) {
	return viewer.IFC.loader.ifcManager.getAllItemsOfType(0, category, false);
}

// Creates a new subset containing all elements of a category
async function newSubsetOfType(category) {
	const ids = await getAll(category);
	return viewer.IFC.loader.ifcManager.createSubset({
		modelID: 0,
		scene,
		ids,
		removePrevious: true,
		customID: category.toString(),
	});
}

// Stores the created subsets
const subsets = {};

async function setupAllCategories() {
	const allCategories = Object.values(categories);
	for (let i = 0; i < allCategories.length; i++) {
		const category = allCategories[i];
		await setupCategory(category);
	}
}

// Creates a new subset and configures the checkbox
async function setupCategory(category) {
	subsets[category] = await newSubsetOfType(category);
  const subset = subsets[category];
  subset.userData.category = category.toString();
  togglePickable(subsets[category], true);
	setupCheckBox(category);
}

// Sets up the checkbox event to hide / show elements
function setupCheckBox(category) {
	const name = getName(category);
	const checkBox = document.getElementById(name);
	checkBox.addEventListener('change', (event) => {

		const checked = event.target.checked;
		const subset = subsets[category];
		if (checked) {
      togglePickable(subset, true);
      scene.add(subset);}
		else {
      subset.removeFromParent();
      togglePickable(subset, false);
    }

    viewer.context.renderer.postProduction.update();
	});
}

function togglePickable(mesh, isPickable){
  if(isPickable){ 
    pickable.push(mesh);
  } else{
    const index = pickable.indexOf(mesh);
    pickable.splice(index, 1);
  }
};
import { notDeepStrictEqual, notEqual } from 'assert';
import { parseLinktext, moment, App, TextComponent, SuggestModal, setIcon, Menu, MenuItem, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, MarkdownRenderer } from 'obsidian';
import * as obsidian from 'obsidian';
import { hasUncaughtExceptionCaptureCallback } from 'process';


class InterSuggestModal extends SuggestModal<string> {
	plugin: InterPlugin
	resolve: any
	reject:any
	values: string[] 
	names?: string[]
	constructor(app: App, plugin: InterPlugin, resolve: any, reject:any, values: string[], names?: string[]) {
	  super(app);
	  this.plugin = plugin;
	  this.resolve = resolve
	  this.reject = reject
	  this.values = values
	  this.names = names 
	}
	getSuggestions(query: string): string[] {
		return this.values.filter((val) => {
			if (val.startsWith("[[")) {
				val = val.replace(/(.*)(\/)([^\/]+)(\]\])(.*)/, "$3$5").replace(/(\[\[)(.*)(\]\])(.*)/, "$2$4")
			}
			return val.toLowerCase().includes(query.toLowerCase())
		});
	}
	renderSuggestion(val: string, el: Element) {
		let text = val
		if (this.names) {
			text = this.names[this.values.indexOf(val)]
		} 
		if (text.startsWith("[[")) {
			text = text.replace(/(.*)(\/)([^\/]+)(\]\])(.*)/, "$3$5")
				.replace(/(\[\[)(.*)(\]\])(.*)/, "$2$4")
				.replace(/(.*\|)(.*)/, "$2")
			let iconWrapper = el.createEl("span", { cls: "inline-icon" })
			el.createEl("span", {text: text})
			setIcon(iconWrapper, "link")
		} else {
			el.createEl("div", {text: text})
		}	
	}
	onChooseSuggestion(val: string) {
		this.resolve(val)
	} 

}









class SuggestPlusModal extends SuggestModal<string> {
    plugin: InterPlugin
	resolve: any
	reject:any
	values: string[] 
	names?: string[]
    currentValue?: string
    constructor(app: App, plugin: InterPlugin, resolve: any, reject:any, values: string[], names?: string[], currentValue?: string) {
	  super(app);
	  this.plugin = plugin;
	  this.resolve = resolve
	  this.reject = reject
	  this.values = values
	  this.names = names 
      this.currentValue = currentValue
	}
    getSuggestions(query: string) {
        if (this.values[0] != "-+-") this.values.unshift("-+-")
        return this.values.filter((val) => {
            if (val.startsWith("[[")) {
                val = val.replace(/(.*)(\/)([^\/]+)(\]\])(.*)/, "$3$5").replace(/(\[\[)(.*)(\]\])(.*)/, "$2$4")
            }
            return val.toLowerCase().includes(query.toLowerCase())
        });
    }
    renderSuggestion(val: string, el: Element) {
        let text = val
        if (this.names) {
            text = this.names[this.values.indexOf(val)]
        } 
        
        if (text.startsWith("[[")) {
            text = text.replace(/(.*)(\/)([^\/]+)(\]\])(.*)/, "$3$5")
                .replace(/(\[\[)(.*)(\]\])(.*)/, "$2$4")
                .replace(/(.*\|)(.+)/, "$2")
            let iconWrapper = el.createEl("span", { cls: "inline-icon" })
            let textEl = el.createEl("span", {text: text})
            setIcon(iconWrapper, "link")
        } else if (text.startsWith("![[")) {
            text = text.replace(/(.*)(\/)([^\/]+)(\]\])(.*)/, "$3$5")
                .replace(/(\[\[)(.*)(\]\])(.*)/, "$2$4")
                .replace(/(.*)(\|)(.+)/, "$1")
            let iconWrapper = el.createEl("span", { cls: "inline-icon" })
            let textEl = el.createEl("span", {text: text})
            setIcon(iconWrapper, "image")
        } else if (val == "-+-") {
            let plusButton = el.createEl("button", {text: "", cls: "div-suggester-plus"})
            setIcon(plusButton, "plus")
        } else {
            let line = el.createEl("div", {cls: "div-suggestion-el-line"})
            line.createEl("div", {text: text})
            let checkedEl = line.createEl("div", {cls: "div-suggestion-el-check"})
            if (text == this.currentValue) setIcon(checkedEl, "check")
        }
    }
    async onChooseSuggestion(val: string) {
        if (val == "-+-") {
            let promptResult = await this.plugin.prompt("", "")
            if (typeof promptResult == "string") {
                this.resolve(promptResult)
            }
            
        } else {
            this.resolve(val)
        }
        
    } 
}









class MultiSuggestModal extends Modal {
    plugin: InterPlugin
	resolve: any
	reject:any
    header: string
	values: string[] 
    currentIncludeAny: string[] 
    currentIncludeAll: string[] 
    currentExcludeAny: string[] 
    currentExcludeAll: string[] 
    activeFilters: string[]
    allValues: boolean
    result: any
	
    constructor(app: App, plugin: InterPlugin, header: string, values: string[], 
        currentIncludeAny: string[], currentIncludeAll: string[], 
        currentExcludeAny: string[], currentExcludeAll: string[], 
        activeFilters: string[], allValues: boolean, resolve: any, reject:any) {
        super(app);
        this.plugin = plugin
        this.header = header
        this.values = values
        this.currentIncludeAny = currentIncludeAny
        this.currentIncludeAll = currentIncludeAll
        this.currentExcludeAny = currentExcludeAny
        this.currentExcludeAll = currentExcludeAll
        this.activeFilters = activeFilters
        this.allValues = allValues
        this.resolve = resolve
	    this.reject = reject
    }

    onOpen() {
        const {contentEl} = this
        contentEl.createEl("h1", {text: this.header})
        let includeAny = this.currentIncludeAny
        let includeAll = this.currentIncludeAll
        let excludeAny = this.currentExcludeAny
        let excludeAll = this.currentExcludeAll

        if (!this.allValues) {
            this.activeFilters = this.activeFilters.filter(f => f == "includeAny" || f == "excludeAny")
        }

        const filterNamesObj: any = {
            "includeAny": {
                "en": "Include any"
            },
            "includeAll": {
                "en": "Include all"
            },
            "excludeAny": {
                "en": "Exclude any"
            },
            "excludeAll": {
                "en": "Exclude all"
            }
        }

        let lang = "en"
        
        if (this.allValues) {
            this.result = {filters: {includeAny, includeAll, excludeAny, excludeAll}, activeFilters: this.activeFilters}
        } else {
            this.result = {filters: {includeAny, excludeAny}, activeFilters: this.activeFilters}
        }

        const createValuePill = (item: string, container: HTMLElement, type: string) => {
            let valuePill = container.createEl("span", {cls: "div-multi-filter-value-pill"})
            let itemText = item

            
            if (itemText.startsWith("[[")) {
                itemText = itemText.replace(/(.*)(\/)([^\/]+)(\]\])(.*)/, "$3$5")
                    .replace(/(\[\[)(.*)(\]\])(.*)/, "$2$4")
                    .replace(/(.*\|)(.+)/, "$2")
                let iconWrapper = valuePill.createEl("span", { cls: "inline-icon" })
                valuePill.createEl("span", {text: itemText, cls: "div-multi-filter-value-text"})
                setIcon(iconWrapper, "link")
            } else {
                valuePill.createEl("span", {text: item, cls: "div-multi-filter-value-text"})

            }
            let removeButton = valuePill.createEl("button", {cls: "div-multi-filter-value-remove"})
    
            setIcon(removeButton, "x")
            removeButton.onclick = () => {
                this.result.filters[type] = this.result.filters[type].filter((v: string) => v != item)
                valuePill.remove()
            }
        }
        
        const createFilterBlock = (type: string, wrapper: HTMLElement) => {
            let filterContainer = wrapper.createEl("div", {cls: "div-multi-filter-container"})
            
            let filterHeader = filterContainer.createEl("div", {cls: "div-multi-filter-header"})

            let texType = filterNamesObj[type][lang]

            filterHeader.createEl("span", {text: texType, cls: "div-multi-filter-header-text"})
            let filterPlusButton = filterHeader.createEl("button", {text: "+", cls: "div-multi-filter-header-plus"})
            setIcon(filterPlusButton, "plus")
            let filterValuesContainer = filterContainer.createEl("div", {cls: "div-multi-filter-values-container"})
            
            filterPlusButton.onclick = async () => {
            let filteredValues = this.values.filter(value => {
                for (let filterType in this.result.filters) {
                if (this.result.filters[filterType].find((i: string) => i == value)) return false
                }
                return true
            })
            let value = await this.plugin.suggester(filteredValues)
            if (value) {
                this.result.filters[type].push(value)
                createValuePill(value, filterValuesContainer, type)
            }
            }
            
            let filterRemoveButton = filterHeader.createEl("button", {cls: "div-multi-filter-header-remove"})
            setIcon(filterRemoveButton, "x")
            filterRemoveButton.onclick = () => {
            this.result.activeFilters = this.result.activeFilters.filter((f: string) => f != type)
            this.result.filters[type] = []
            filterContainer.remove()
            }
            
            for (let value of this.result.filters[type]) {
            createValuePill(value, filterValuesContainer, type)
            }
        }
        
        const updateFilters = (filterWrapper: HTMLElement) => {
            filterWrapper.innerHTML = ""
            for (let filter of this.result.activeFilters) {
            createFilterBlock(filter, filterWrapper)
            }
        }
        
        let createFilterButton = contentEl.createEl("button", {text: "Add filter"})
        createFilterButton.onclick = async () => {
            let filterTypes = Object.keys(this.result.filters)
            filterTypes = filterTypes.filter(type => !this.result.activeFilters.find((f: string) => f == type))


            let filterNames = filterTypes.map(type => filterNamesObj[type][lang])

            let filter = await this.plugin.suggester(filterTypes, filterNames)
            this.result.activeFilters.push(filter)
            updateFilters(filterWrapper)
        }
        
        let filterWrapper = contentEl.createEl("div")
        updateFilters(filterWrapper)
    }

    onClose() {
        const {contentEl} = this
        contentEl.empty()
        if (this.result) {
            this.resolve(this.result)
        }
        this.reject("Task not submitted")
    } 
}





class SelectionInputModal extends Modal {
	resolve: any
	reject:any
	name: string
	defaultVal: string
	result: string
	values: string[]
	names?: string[]

	constructor(app: App, resolve: any, reject:any, name: string, values: string[], names?: string[], defaultVal?: string) {
	  super(app);
	  this.resolve = resolve
	  this.reject = reject
	  this.name = name
	  this.defaultVal = defaultVal || ""
	  this.values = values
	  this.names = names
	  this.result = this.defaultVal
	  this.eventInput = this.eventInput.bind(this)
	}
	eventInput(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			this.resolve(this.result)
			this.close()
		}
	}
	onOpen() {

		this.modalEl.style.width = "400px";
		const {contentEl} = this
		contentEl.createEl("h1", {text: this.name})
		const selectSetting = new Setting(contentEl)
		selectSetting.settingEl.style.display = "grid";
		selectSetting.addDropdown(drop => {
			this.values.forEach(val => {
				let name = val
				if (this.names) {
					name = this.names[this.values.indexOf(val)]
				}
				drop.addOption(val, name)
			})
			drop.onChange((value) => {
				this.result = value
			})
			drop.setValue(this.defaultVal)
			drop.selectEl.style.width = "100%";
		})


		new Setting(contentEl).addButton((btn) => btn
		.setButtonText("Сохранить")
		.setCta()
		.onClick(() => {
			this.resolve(this.result)
			this.close()
		}))
		contentEl.addEventListener("keydown", this.eventInput)
	}
	onClose() {
		const {contentEl} = this
		contentEl.empty()
		this.contentEl.removeEventListener("keydown", this.eventInput)
		this.reject("Not submitted") 
	} 
}







class DatePeriodInputModal extends Modal {
	resolve: any
	reject:any
	name: string
	defaultStart: string
    defaultEnd: string
	result: {start: string, end: string}
	startText: TextComponent
	endText: TextComponent
    inputType: string
	constructor(app: App, name: string, defaultStart: string, defaultEnd: string, inputType: string, resolve: any, reject:any) {
	  super(app);
	  this.resolve = resolve
	  this.reject = reject
	  this.name = name
	  this.defaultStart = defaultStart 
      this.defaultEnd = defaultEnd 
	  this.result = {start: "", end: ""}
      this.inputType = inputType
	  this.eventInput = this.eventInput.bind(this)
	}
	eventInput(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			this.resolve(this.result)
			this.close()
		}
	}
	onOpen() {
		const {contentEl} = this
		contentEl.classList.add("date-input-modal")
		contentEl.createEl("h1", {text: this.name})

		const startInputSetting = new Setting(contentEl)
		startInputSetting.setName("Start date")
		startInputSetting.addText((text) => {
			this.startText = text
			text.setValue(this.defaultStart)
			this.result.start = this.defaultStart
			text.onChange((value) => {
			   	this.result.start = value
			   	if (this.result.start != "") {
					this.endText.inputEl.setAttribute("min", this.result.start)
				} else {
					this.endText.inputEl.removeAttribute("min")
				}
			})
			text.inputEl.style.width = "120px";
			text.inputEl.type = this.inputType
		})




		const endInputSetting = new Setting(contentEl)
		endInputSetting.setName("End date")
		endInputSetting.addText((text) => {
			this.endText = text
			text.setValue(this.defaultEnd)
			this.result.end = this.defaultEnd
			text.onChange((value) => {
			    this.result.end = value
			    if (this.result.end != "") {
					this.startText.inputEl.setAttribute("max", this.result.end)
				} else {
					this.startText.inputEl.removeAttribute("max")
				}
			})
			text.inputEl.style.width = "120px";
			text.inputEl.type = this.inputType
		})



		new Setting(contentEl).addButton((btn) => btn
		.setButtonText("Сохранить")
		.setCta()
		.onClick(() => {
			this.resolve(this.result)
			this.close()
		}))
		contentEl.addEventListener("keydown", this.eventInput)
	}
	onClose() {
		const {contentEl} = this
		contentEl.empty()
		this.contentEl.removeEventListener("keydown", this.eventInput)
		this.reject("Not submitted") 
	} 
}





const DateInputModalBare = class extends Modal {
    resolve: any
	reject:any
	name: string
	defaultDate: string
	result: string
    constructor(app: App, name: string, defaultDate: string, resolve: any, reject:any) {
    super(app);
    this.result = defaultDate
    this.resolve = resolve
    this.reject = reject
    this.name = name
    this.defaultDate = defaultDate 
    this.eventInput = this.eventInput.bind(this)
    }

    eventInput(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			this.resolve(this.result)
			this.close()
		}
	}
    onOpen() {
        const {contentEl} = this
        contentEl.classList.add("date-input-modal")
        const today = moment().format("YYYY-MM-DD")
        if (!this.defaultDate) this.defaultDate = today
        contentEl.createEl("h1", {text: this.name})

        const dateInputEl = new Setting(contentEl)
        .addText((text) => {
            text.setValue(this.defaultDate)
            this.result = this.defaultDate
            
            text.onChange((value) => {
            this.result = value
            })
            text.inputEl.type = "date"
        })

        new Setting(contentEl).addButton((btn) => btn
        .setButtonText("Сохранить")
        .setCta()
        .onClick(() => {
            this.resolve(this.result)
            this.close()
        }))
        contentEl.addEventListener("keydown", this.eventInput)
    }
    onClose() {
        const {contentEl} = this
        contentEl.empty()
        this.contentEl.removeEventListener("keydown", this.eventInput)
        this.reject("Not submitted") 
    } 
}









const PromptModal = class extends Modal {
    resolve: any
	reject:any
    result: string
    name: string
    defaultVal: string

    constructor(app: App, name: string, defaultVal: string, resolve: any, reject:any) {
        super(app);
        this.result = defaultVal
        this.defaultVal = defaultVal
        this.resolve = resolve
        this.reject = reject
        this.name = name
        this.eventInput = this.eventInput.bind(this)
    }
    eventInput(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            this.resolve(this.result)
            this.close()
        }
    }
    onOpen() {
        const {contentEl} = this
        contentEl.createEl("h1", {text: this.name})

        const inputSetting = new Setting(contentEl)
        inputSetting.settingEl.style.display = "grid";
        inputSetting.addText((text) => {
            text.setValue(this.defaultVal)
            text.onChange((value) => {
                this.result = value
                
            })
            text.inputEl.style.width = "100%";
        })
        new Setting(contentEl).addButton((btn) => btn
        .setButtonText("Сохранить")
        .setCta()
        .onClick(() => {
            this.resolve(this.result)
            this.close()
        }))
        contentEl.addEventListener("keydown", this.eventInput)
    }
    onClose() {
        const {contentEl} = this
        contentEl.empty()
        this.contentEl.removeEventListener("keydown", this.eventInput)
        this.reject("Not submitted") 
    } 
}





class NumberInputModal extends Modal {
	resolve: any
	reject:any
	name: string
	defaultVal: number | null
	result: number | null
	constructor(app: App, name: string, defaultVal: number | null, resolve: any, reject:any) {
	  super(app);
	  this.resolve = resolve
	  this.reject = reject
	  this.name = name
	  this.defaultVal = defaultVal 
	  this.eventInput = this.eventInput.bind(this)
	}
	eventInput(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			this.resolve(this.result)
			this.close()
		}
	}
	onOpen() {
		const {contentEl} = this
		contentEl.createEl("h1", {text: this.name})
		const inputSetting = new Setting(contentEl)
		inputSetting.settingEl.style.display = "grid";
		inputSetting.addButton((btn) => btn
		.setButtonText("-")
		.setCta()
		.onClick(() => {
			this.result = Number(this.result! - 1)
			let inputEl: HTMLInputElement | null = contentEl.querySelector(".number-input-el")
			inputEl!.value = this.result + ""
		}))
		inputSetting.addText((text) => {
			text.inputEl.type = "number"
			text.inputEl.className = "number-input-el"
			text.setValue(this.defaultVal + "")
			this.result = this.defaultVal
			text.onChange((value) => {
			   if (value && value != "") {
				this.result = Number(value)
			   } else {
				this.result = null
			   }
			})
			text.inputEl.style.width = "100%";
		})
		inputSetting.addButton((btn) => btn
		.setButtonText("+")
		.setCta()
		.onClick(() => {
			this.result = Number(this.result) + 1
			let inputEl: HTMLInputElement | null = contentEl.querySelector(".number-input-el")
			inputEl!.value = this.result + ""
		}))
		new Setting(contentEl).addButton((btn) => btn
		.setButtonText("Сохранить")
		.setCta()
		.onClick(() => {
			this.resolve(this.result)
			this.close()
		}))
		contentEl.addEventListener("keydown", this.eventInput)
	}
	onClose() {
		const {contentEl} = this
		contentEl.empty()
		this.contentEl.removeEventListener("keydown", this.eventInput)
		this.reject("Not submitted") 
	} 
}











export default class InterPlugin extends Plugin {

	sourcePath: string
	sourceFile: TFile
	id: string
	container: HTMLElement
	data: any

	async onload() {

        this.registerMarkdownCodeBlockProcessor('renderer', (code, container, ctx) => {
			let rn = {code, container, ctx, obsidian}
			try {
				(new Function('rn', rn.code)(rn))
			} catch (err) {
				console.error(err);
				rn.container.createEl("pre", {text: err.stack, cls: "renderer-error"})
			}
    	});



		

		this.registerMarkdownCodeBlockProcessor('inter', async (code, container, ctx) => {

			try {
				this.container = container
				let codeData = this.parseCode(code)
				this.id = "noId"
				if (codeData.id) this.id = codeData.id.replaceAll(" ", "-")
				this.sourcePath = ctx.sourcePath
				let file = this.app.vault.getAbstractFileByPath(this.sourcePath)
				if (file instanceof TFile) {
					this.sourceFile = file
				}

				
				this.buildView()
			} catch (err) {
				console.error(err)
			}

			
			
    	})



	}

	onunload() {}


	async buildView() {
        this.data = await this.getData()
        this.fixData()
		let viewContainer = await this.renderTableView()
        this.container.innerHTML = ""
        this.container.append(viewContainer)
	}


	parseCode(code:string) {
		code = code.trim()
		let lines = code.split("\n")
		let codeData: Record<string, string> = {}
		for (let line of lines) {
			let lineParts = line.split(":")
			if (lineParts.length == 2) {
				let key = lineParts[0].trim()
				let val = lineParts[1].trim()
				codeData[key] = val
			} 
		}
		return codeData
	}

	async renderTableView() {
        let data = this.data
        let settings = data[this.id].settings
		let view = settings.view || "table"
        let filters = data[this.id].filters
        let currentSearch = data[this.id].settings.currentSearch
        
        let files = this.app.vault.getFiles()
        let filteredFiles = await this.asyncFilter(files, async(file: TFile) => {
            for (let filter in filters) {
                let isInFilter = await this.fileInFilter(file, filters[filter])
                if (!isInFilter) return false 
            }
            if (currentSearch) {
                if (!file.basename.toLowerCase().includes(currentSearch.toLowerCase())) {
                    return false
                }
            }
            return true
        })

        if (settings.sortProperty) {
            let sortProperty = settings.sortProperty
            let sortDirection = settings.sortDirection
            let propType = this.getPropertyType(sortProperty)

            let fileValueObj: any = {}
            await Promise.all(files.map(async file => {
                let propValue
                if (sortProperty.startsWith("file.")) {
                    propValue = await this.getFilePropValue(file, sortProperty)
                } else {
                    propValue = await this.getPropValue(file, sortProperty)
                }

                if (!propValue) {
                    propValue = ""
                    if (propType == "number") propValue = 0
                }
                if (Array.isArray(propValue)) propValue = propValue.join("")
                fileValueObj[file.path] = propValue
                return
            }))

            filteredFiles = filteredFiles.sort((fileA, fileB) => {
                let valA = fileValueObj[fileA.path]
                let valB = fileValueObj[fileB.path]

                if (sortDirection == "asc") {
                    if (valA < valB) return -1
                    if (valA > valB) return 1
                }

                if (sortDirection == "desc") {
                    if (valA < valB) return 1
                    if (valA > valB) return -1
                }
                
                return 0
            })

        }

        let filteredLength = filteredFiles.length
        if (settings.pagination) filteredFiles = this.paginate(filteredFiles)
        

        let viewContainer = document.createElement("div")
        viewContainer.classList.add("div-view-container")
        viewContainer.classList.add("div-view-" + view)
        viewContainer.classList.add("div-id-" + this.id)

		let controlPanel = viewContainer.createEl("div", {cls: "div-control-panel"})

        this.createOptionsButton(controlPanel)
        this.createPlusButton(controlPanel)
        this.createViewButton(controlPanel)
        this.addFilterButtons(controlPanel)
        if (settings.pagination) this.createPaginationBlock(controlPanel, filteredLength)
        if (settings.showSearch) this.createSearchBlock(controlPanel)
        
        this.createRefreshButton(controlPanel)

        let tableContainer = viewContainer.createEl("div", {cls: "div-table-container"})
        if (settings.cards_width) tableContainer.classList.add("div-cards-width-" + settings.cards_width)
		await this.createDBTable(tableContainer, filteredFiles)

        this.addListeners(viewContainer)

        return viewContainer
	}



    createSearchBlock(controlPanel: HTMLElement) {
        let currentSearch = this.data[this.id].settings.currentSearch
        if(!currentSearch) currentSearch = ""

        let searchWrapper = document.createElement("span")
        searchWrapper.classList.add("div-search-wrapper")

        let searchInput = document.createElement("input")
        searchInput.classList.add("div-search-input")

        searchInput.value = currentSearch
        searchInput.onchange = () => {
            this.data[this.id].settings.currentSearch = searchInput.value
            this.saveData(this.data)
        }

        let clearSearchButton = document.createElement("button")
        clearSearchButton.classList.add("div-clear-search-button")
        setIcon(clearSearchButton, "x")

        clearSearchButton.onclick = () => {
            this.data[this.id].settings.currentSearch = ""
            this.saveData(this.data)
        }



        

        searchWrapper.append(searchInput)
        searchWrapper.append(clearSearchButton)
        controlPanel.append(searchWrapper)
    }


    addListeners(viewContainer: HTMLElement) {
        let data = this.data
        let cells = viewContainer.querySelectorAll(".div-cell-wrapper")

        
        for (let c of cells) {
            let cell = c as HTMLElement
            let type = cell.getAttribute("data-type")
            let propName = cell.getAttribute("data-prop") || ""
            let path = cell.getAttribute("data-path") || ""
            let file = this.app.vault.getAbstractFileByPath(path) 
            if (file instanceof TFile) {
                if (type == "text" || type == "multitext" || propName == "file.link" || propName == "file.name") {

                cell.addEventListener("contextmenu", (e) => {
                    this.cellEditMenu(e, cell)
                })
                

                cell.addEventListener("dblclick", () => {
                    this.editingMode(cell)
                })

                if (data[this.id].columns[propName].openOnClick) {
                    cell.onclick = (e) => {
                        let leaf = this.app.workspace.getLeaf()
                        
                        if (e.ctrlKey) {
                            if (e.altKey) {
                                if (e.shiftKey) leaf = this.app.workspace.getLeaf("window")
                                else leaf = this.app.workspace.getLeaf("split")
                            } else leaf = this.app.workspace.getLeaf("tab")
                        } 

                        let file = this.app.vault.getAbstractFileByPath(path)
                        if (file instanceof TFile) leaf.openFile(file)
                    }
                }
                }
                
                if (propName == "file.tasks") {
                    let taskCheckboxes = cell.querySelectorAll(".div-task-list-clickable-checkbox")
                    for (let taskCheckbox of taskCheckboxes) {
                        if (taskCheckbox instanceof HTMLInputElement) {
                            taskCheckbox.onclick = () => {
                                if (taskCheckbox instanceof HTMLInputElement && file instanceof TFile) this.processTaskCheckbox(taskCheckbox, file)
                            }
                        }  
                    }
                }

                if (propName.startsWith("file.")) continue

                if (type == "number") {
                    this.editCellNumber(cell, propName, file) 
                }

                if (type == "date" || type == "datetime") {
                    let dateInput = cell.querySelector("input")
                    if (dateInput) {
                        dateInput.onchange = (e) => {
                            if (e.target instanceof HTMLInputElement && file instanceof TFile) {
                                this.savePropertyValue(file, propName, e.target.value)  
                            }  
                        }
                    }
                }

                if (type == "checkbox") {
                    let checkbox = cell.querySelector("input")
                    if (checkbox instanceof HTMLInputElement) {
                        checkbox.addEventListener("click", () => {
                            if (checkbox && file instanceof TFile) this.savePropertyValue(file, propName, checkbox.checked)
                        })
                    }
                }
            }
        }
        



        let headers = viewContainer.querySelectorAll(".div-column-header")
        for (let h of headers) {
            let header = h as HTMLElement
            
            let propName = header.getAttribute("data-prop") || ""
            header.addEventListener("contextmenu", (e) => {
                this.columnOptionsMenu(propName, e)
            })

            header.onclick = () => {
                this.setSorting(propName)
            }

        }    
    }




    cellEditMenu(e: MouseEvent, cell: HTMLElement) {
        let menu = new obsidian.Menu()
        menu.addItem(item => {
            item.setTitle("Редактировать ячейку")
            .setIcon("edit")
            .onClick(() => {
                this.editingMode(cell)
            })
        })
        menu.showAtMouseEvent(e)
    }









    async editingMode(cell: HTMLElement) {
        let data = this.data
        let type = cell.getAttribute("data-type")
        let propName = cell.getAttribute("data-prop") || ""
        let path = cell.getAttribute("data-path") || ""
        let file = this.app.vault.getAbstractFileByPath(path) as TFile
        
        if (file instanceof TFile) {
            let currentValue = await this.getPropValue(file, propName)
            let editCellType = data[this.id].columns[propName].editType

            if (propName == "file.link" || propName == "file.name") {
                this.editCellFileName(cell, file)
            } else if (type == "text") {
                if (editCellType == "selectOne") {
                    this.editCellSelect(cell, currentValue, propName, file, type)
                } else {
                    this.editCellText(cell, currentValue, propName, file)
                }
            } else if (type == "multitext") {
                if (editCellType == "selectOne") {
                    this.editCellSelect(cell, currentValue, propName, file, type)
                } else {
                    this.editCellMultitext(cell, currentValue, propName, file)
                }
            }
        }
    }


    async editCellText(cell: HTMLElement, currentValue: any, propName: string, file: TFile) {
        if (!currentValue) currentValue = ""
        cell.setAttribute("contenteditable", "true")
        cell.innerText = currentValue
        cell.classList.add("div-edit-text")
        cell.focus()

        // Move cursor to the end of text
        let range = document.createRange()
        range.selectNodeContents(cell)
        range.collapse(false)
        let selection = window.getSelection()
        if (selection) {
            selection.removeAllRanges()
            selection.addRange(range)
        }
        
        cell.onkeydown = (e) => {
            if (e.key == "Enter" && !e.shiftKey) {
                e.preventDefault()
                cell.blur()
            }
        }

        cell.onblur = () => {
            this.savePropertyValue(file, propName, cell.innerText)
        }
    }


    async savePropertyValue(file: TFile, propName: string, value: any) {
        await this.app.fileManager.processFrontMatter(file, fm => {
            fm[propName] = value
        })
        setTimeout(() => {
            this.buildView() 
        }, 250)
    }


    async editCellSelect(cell: HTMLElement, currentValue: any, propName: string, file: TFile, type: string) {
        let values = await this.getAllPropertyValues(propName)
        let value = await this.suggesterPlus(values, values, currentValue)

        if (value) {
            if (type == "text") currentValue = value
            if (type == "multitext") currentValue = [value]
            this.savePropertyValue(file, propName, currentValue)
        }     
    }




    async editCellMultitext(cell: HTMLElement, currentValues: any, propName: string, file: TFile) {
        if (cell.classList.contains("div-edit-multitext")) return
        const handleClickOutside = (e: MouseEvent) => {
            if (e.target instanceof HTMLElement) {
                if (e.target.closest(".div-multi-filter-value-remove") ||
                e.target.closest(".div-edit-multitext") || 
                e.target.closest(".mod-cta") || 
                e.target.closest(".prompt") ||
                e.target.closest(".menu")) {
                return
                }
            } else return
            
            this.savePropertyValue(file, propName, currentValues)
            document.removeEventListener("click", handleClickOutside)
        }

        if (!currentValues) currentValues = []
        if (!Array.isArray(currentValues)) currentValues = [currentValues]
        
        let values = await this.getAllPropertyValues(propName)
        let ul = cell.querySelector("ul.div-cell-list")
        let els = cell.querySelectorAll("li.div-list-item")
        cell.classList.add("div-edit-multitext")

        const addRemoveButton = (el: Element, markdown: string) => {
            let removeButton = document.createElement("button")
            removeButton.classList.add("div-multi-filter-value-remove")
            setIcon(removeButton, "x")
            el.append(removeButton)
            
            removeButton.onclick = () => {
                let j = currentValues.indexOf(markdown)
                currentValues.splice(j, 1)
                el.remove()
            } 
        }

        for (let i = 0; i < els.length; i++) {
            let el = els[i]
            let markdown = currentValues[i]
            addRemoveButton(el, markdown)
        }

        let plusButton = document.createElement("button")
        plusButton.classList.add("div-multi-filter-header-plus")
        setIcon(plusButton, "plus")

        plusButton.onclick = async () => {
            for (let currentVal of currentValues) {
                values = values.filter(val => val != currentVal)
            }
            let value = await this.suggesterPlus(values)

            if (value) {
                currentValues.push(value)

                if (ul) {
                    let li = ul.createEl("li")
                    MarkdownRenderer.render(this.app, value, li, "", this)
                    addRemoveButton(li, value)
                }                
            }     
        }
        document.addEventListener("click", handleClickOutside)
        cell.append(plusButton)
    }




    async editCellFileName(cell: HTMLElement, file: TFile) {
        let currentFileName = file.basename
        cell.setAttribute("contenteditable", "true")
        cell.innerText = currentFileName
        cell.classList.add("div-edit-text")
        cell.focus()

        // Move cursor to the end of text
        let range = document.createRange()
        range.selectNodeContents(cell)
        range.collapse(false)
        let selection = window.getSelection()
        if (selection) {
            selection.removeAllRanges()
            selection.addRange(range)
        }
        
        cell.onkeydown = (e) => {
            if (e.key == "Enter") {
                e.preventDefault()
                cell.blur()
            }
        }
            
        cell.onblur = () => {
            this.renameFile(file, cell.innerText)
        }
    }


    async renameFile(file: TFile, newName: string) {
        newName = newName.replaceAll(/[\#\^\[\]\|\\\/\:\n]/g, "")
        let currentPath = file.path
        let parentPath = file.parent?.path
        if (parentPath == "/") parentPath = ""
        else parentPath = parentPath + "/"
        let ext = file.extension
        let newPath = parentPath + newName + "." + ext

        if (newPath != currentPath) {
            let existingFile = this.app.vault.getAbstractFileByPath(newPath)
            if (existingFile) new Notice("Destination file already exists")
            else await this.app.fileManager.renameFile(file, newPath)
            setTimeout(() => {
                this.buildView() 
            }, 250)
        }
    }



    async editCellNumber(cell: HTMLElement, propName: string, file: TFile) {
        let inputWrapper = cell.querySelector(".div-edit-number-wrapper")
        if (!inputWrapper) return
        let numberInput = cell.querySelector("input") 
        let progressWrapper = cell.querySelector(".div-number-progress-wrapper")
        if (numberInput instanceof HTMLInputElement) {
            let plusButton = cell.querySelector(".div-edit-number-plus")
            let minusButton = cell.querySelector(".div-edit-number-minus")

            const handleClickOutside = (e: Event) => {
                if (e.target instanceof HTMLElement && !e.target.closest(".div-edit-number-wrapper")) {
                    if (numberInput) this.savePropertyValue(file, propName, Number(numberInput.value))
                    document.removeEventListener("click", handleClickOutside)
                }
            }

            numberInput.onfocus = () => {
                if (inputWrapper) inputWrapper.classList.add("focused")
                document.addEventListener("click", handleClickOutside)
            }

            numberInput.onkeydown = (e) => {
                if (e.key == "Enter") {
                    if (numberInput) this.savePropertyValue(file, propName, Number(numberInput.value))
                    document.removeEventListener("click", handleClickOutside)
                }                    
            }

            if (plusButton instanceof HTMLButtonElement) {
                plusButton.onclick = () => {
                    if (numberInput) numberInput.value = (Number(numberInput.value) + 1).toString()
                    if (inputWrapper) inputWrapper.classList.add("focused")
                    document.addEventListener("click", handleClickOutside)
                }
            }

            
            if (minusButton instanceof HTMLButtonElement) {
                minusButton.onclick = () => {
                    if (numberInput) numberInput.value = (Number(numberInput.value) - 1).toString()
                    if (inputWrapper) inputWrapper.classList.add("focused")
                    document.addEventListener("click", handleClickOutside)
                }
            }
            
        }

        

        if (progressWrapper) {
            let currentValue = await this.getPropValue(file, propName)
            progressWrapper.addEventListener("dblclick", () => {
                this.renderNumber(cell, currentValue)
                this.editCellNumber(cell, propName, file)
                cell.classList.remove("div-cell-number-percent")
                numberInput = cell.querySelector("input")
                if (numberInput) numberInput.focus()

            })
        }
    }







    columnOptionsMenu(propName: string, e: MouseEvent) {
        let data = this.data
        let type = this.getPropertyType(propName)
        let menu = new obsidian.Menu()

        menu.addItem(item => {
            item.setTitle("Изменить заголовок")
            .setIcon("edit")
            .onClick(() => {
                this.changeColumnTitle(propName)
            })
        })

        menu.addItem(item => {
            item.setTitle("Изменить иконку")
            .setIcon("image")
            .onClick(() => {
                this.changeColumnIcon(propName)
            })
        })



        if (type == "number") {
            let currentView = this.data[this.id].columns[propName].view
            menu.addItem(item => {
                item.setTitle("Тип отображения")
                //@ts-ignore
                let sub = item.setSubmenu() as Menu
                sub.addItem(subitem => {
                    subitem.setTitle("Число")
                    .setChecked(!currentView || currentView == "number")
                    .onClick(() => {
                        this.setPropView(propName, "number")
                        
                    })
                    
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Прогресс (процент от 100)")
                    .setChecked(currentView && currentView == "progress percent")
                    .onClick(() => {
                        this.setPropView(propName, "progress percent")
                        
                    })
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Прогресс (процент от другого свойства)")
                    .setChecked(currentView && currentView.startsWith("progress of"))
                    .onClick(() => {
                        this.setPropView(propName, "progress of")
                    })
                })
            })
        }


        if (propName == "file.tasks") {
            menu.addItem(item => {
                item.setTitle("Тип отображения")
                //@ts-ignore
                let sub = item.setSubmenu() as Menu
                sub.addItem(subitem => {
                    subitem.setTitle("Список задач")
                    .onClick(() => {
                        this.setPropView(propName, "task list")
                        
                    })
                    
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Количество выполненных задач")
                    .onClick(() => {
                        this.setPropView(propName, "completion numbers")
                    })
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Процент выполненных задач")
                    .onClick(() => {
                        this.setPropView(propName, "completion percent")
                    })
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Прогресс выполнения (цифры)")
                    .onClick(() => {
                        this.setPropView(propName, "completion progress with numbers")
                    })
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Прогресс выполнения (проценты)")
                    .onClick(() => {
                        this.setPropView(propName, "completion progress with percents")
                    })
                })
            })
        }





        if (type == "text") {
            menu.addItem(item => {
                item.setTitle("Метод редактирования")
                item.setIcon("?")
                //@ts-ignore
                let sub = item.setSubmenu() as Menu
                let currentEditType = data[this.id].columns[propName].editType
                sub.addItem(subitem => {
                    subitem.setTitle("Выбрать из вариантов")
                    subitem.setIcon("layout-list")
                    .setChecked(currentEditType == "selectOne")
                    .onClick(() => {
                        this.setCellEditType(propName, "selectOne")
                    })
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Редактировать текст")
                    subitem.setIcon("edit-2")
                    .setChecked(!currentEditType || currentEditType == "editText")
                    .onClick(() => {
                        this.setCellEditType(propName, "editText")
                    })
                })
            })
        }


        if (type == "multitext") {
            menu.addItem(item => {
                item.setTitle("Метод редактирования")
                //@ts-ignore
                let sub = item.setSubmenu() as Menu
                let currentEditType = data[this.id].columns[propName].editType
                sub.addItem(subitem => {
                    subitem.setTitle("Выбрать один вариант")
                    .setChecked(currentEditType == "selectOne")
                    .onClick(() => {
                        this.setCellEditType(propName, "selectOne")
                    })
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Выбрать несколько вариантов")
                    .setChecked(!currentEditType || currentEditType == "selectMultiple")
                    .onClick(() => {
                        this.setCellEditType(propName, "selectMultiple")
                    })
                })
            })


            let listView = data[this.id].columns[propName].list_view
            if (listView == "inline") {
                menu.addItem(item => {
                    item.setTitle("Отображать элементы как список")
                    item.setIcon("list")
                    .onClick(() => {
                        this.setListView(propName, "list")
                    })
                })
            } else {
                menu.addItem(item => {
                    item.setTitle("Отображать элементы в строку")
                    item.setIcon("gallery-horizontal")
                    .onClick(() => {
                        this.setListView(propName, "inline")
                    })
                })
            }


            
        }


        
        





        if (type == "text" || type == "multitext") {


            menu.addItem(item => {
                let title = "Открывать заметку по клику на ячейку"
                let icon = "link-2"
                if (this.data[this.id].columns[propName].openOnClick) {
                    title = "Не открывать заметку по клику на ячейку"
                    icon = "link-2off"
                }
                item.setTitle(title)
                item.setIcon(icon)
                .onClick(() => {
                    this.toggleOpenNoteOnClick(propName)
                })
            })

            menu.addItem(item => {
                item.setTitle("Размер изображений")
                .setIcon("image")
                //@ts-ignore
                let sub = item.setSubmenu() as Menu
    
                let currentImageSize = data[this.id].columns[propName].image_size
                if (!currentImageSize) currentImageSize = "120x120"
                
                let sizes = ["50x75", "80x120", "100x150", "150x225", "200x300"]
    
                for (let size of sizes) {
                    sub.addItem(subitem => {
                        subitem.setTitle(size)
                        .setChecked(currentImageSize == size)
                        .onClick(() => {
                            this.setImageSize(propName, size)
                        })
                    })
                }
    
                sub.addSeparator()
    
                let sizesSquare = ["75x75", "120x120", "150x150", "225x225", "300x300"]
    
                for (let size of sizesSquare) {
                    sub.addItem(subitem => {
                        subitem.setTitle(size)
                        .setChecked(currentImageSize == size)
                        .onClick(() => {
                            this.setImageSize(propName, size)
                        })
                    })
                }
    
                sub.addSeparator()
    
                let sizesHorizontal = ["75x50", "120x80", "150x100", "225x150", "300x200"]
    
                for (let size of sizesHorizontal) {
                    sub.addItem(subitem => {
                        subitem.setTitle(size)
                        .setChecked(currentImageSize == size)
                        .onClick(() => {
                            this.setImageSize(propName, size)
                        })
                    })
                }
               
            })
    
    
            menu.addItem(item => {
                item.setTitle("Параметры изображений")
                .setIcon("image")
                //@ts-ignore
                let sub = item.setSubmenu() as Menu
                let currentImageFit = data[this.id].columns[propName].image_fit
    
                sub.addItem(subitem => {
                    subitem.setTitle("Заполнить")
                    .setChecked(currentImageFit == "cover")
                    .onClick(() => {
                        this.setImageFit(propName, "cover")
                    })
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Вписать")
                    .setChecked(!currentImageFit || currentImageFit == "contain")
                    .onClick(() => {
                        this.setImageFit(propName, "contain")
                    })
                })
               
            })

        }

        



        



        
        menu.addItem(item => {
            item.setTitle("Выравнивание")
            .setIcon("align-justify")
            //@ts-ignore
            let sub = item.setSubmenu() as Menu
            let currentAlign = data[this.id].columns[propName].align
            sub.addItem(subitem => {
                subitem.setTitle("По левому краю")
                .setIcon("align-left")
                .setChecked(!currentAlign || currentAlign == "left")
                .onClick(() => {
                    this.setAlign(propName, "left")
                    
                })
                
            })
            sub.addItem(subitem => {
                subitem.setTitle("По центру")
                .setIcon("align-center")
                .setChecked(currentAlign == "center")
                .onClick(() => {
                    this.setAlign(propName, "center")
                    
                })
            })
            sub.addItem(subitem => {
                subitem.setTitle("По правому краю")
                .setIcon("align-right")
                .setChecked(currentAlign == "right")
                .onClick(() => {
                    this.setAlign(propName, "right")
                })
            })
        })

        menu.addItem(item => {
            item.setTitle("Сбросить настройки колонки")
            .setIcon("refresh-ccw")
            .onClick(() => {
                this.clearColumnSettings(propName)
            })
        })

        menu.addItem(item => {
            item.setTitle("Удалить колонку")
            .setIcon("x")
            .onClick(() => {
                this.removeColumn(propName)
            })
        })
        
        
        menu.showAtMouseEvent(e)
    }



    filterOptionsMenu(propName: string, e: MouseEvent) {
        

        let type = this.getPropertyType(propName)

        let menu = new obsidian.Menu()


        if (type == "text" || type == "multitext" || type == "number") {
            menu.addItem(item => {
                item.setTitle("Тип фильтра")
                //@ts-ignore
                let sub = item.setSubmenu() as Menu
                let currentType = this.data[this.id].filters[propName].type
                sub.addItem(subitem => {
                    subitem.setTitle("Выбор одного варианта")
                    .setChecked(!currentType || currentType == "selectOne")
                    .onClick(() => {
                        this.setFilterType(propName, "selectOne")
                    })
                    
                })
                sub.addItem(subitem => {
                    subitem.setTitle("Выбор нескольких вариантов")
                    .setChecked(currentType == "selectMultiple")
                    .onClick(() => {
                        this.setFilterType(propName, "selectMultiple")
                    })
                })
            })
        }


        


        
        menu.addItem(item => {
            item.setTitle("Очистить фильтр")
            .onClick(() => {
                this.clearFilterValues(propName)
            })
        })
        menu.addItem(item => {
            item.setTitle("Изменить тип свойства")
            .onClick(() => {
                this.changePropType(propName)
            })
            
        })

        menu.addItem(item => {
            item.setTitle("Изменить название кнопки")
            .onClick(() => {
                this.changeFilterButtonName(propName)
            })
        })

        menu.addItem(item => {
            item.setTitle("Изменить иконку")
            .onClick(() => {
                this.changeFilterButtonIcon(propName)
            })
        })


        menu.addItem(item => {
            item.setTitle("Сбросить настройки фильтра")
            .setIcon("refresh-ccw")
            .onClick(() => {
                this.clearFilterSettings(propName)
            })
        })


        menu.addItem(item => {
            item.setTitle("Удалить фильтр")
            .setIcon("x")
            .onClick(() => {
                this.removeFilter(propName)
            })
        })


        menu.showAtMouseEvent(e)
        


    }








    async changeColumnTitle(propName: string) {
        let currentTitle = this.data[this.id].columns[propName].title
        let title = await this.prompt("name", currentTitle)
        
        if (title != currentTitle) {
            this.data[this.id].columns[propName].title = title
            this.saveData(this.data)
        }
    }


    async changeColumnIcon(propName: string) {
        let currentIcon = this.data[this.id].columns[propName].icon
        let icon = await this.prompt("name", currentIcon)
        
        if (icon != currentIcon) {
            this.data[this.id].columns[propName].icon = icon
            this.saveData(this.data)
        }
    }


    async changeFilterButtonName(propName: string) {
        let data = this.data
        let currentButtonName = data[this.id].filters[propName].buttonName
        let buttonName = await this.prompt("name", currentButtonName)
        if (buttonName != currentButtonName) {
            data[this.id].filters[propName].buttonName = buttonName
            this.saveData(data)
        }
    }


    async changeFilterButtonIcon(propName: string) {
        let data = this.data
        let currentButtonIcon = data[this.id].filters[propName].buttonIcon
        let buttonIcon = await this.prompt("name", currentButtonIcon)
        if (buttonIcon != currentButtonIcon) {
            data[this.id].filters[propName].buttonIcon = buttonIcon
            this.saveData(data)
        }
    }







    removeColumn(propName: string) {
        delete this.data[this.id].columns[propName]
        this.saveData(this.data)
    }


    removeFilter(propName: string) {
        delete this.data[this.id].filters[propName]
        this.saveData(this.data)
    }


    clearColumnSettings(propName: string) {
        this.data[this.id].columns[propName] = {name: propName}
        this.saveData(this.data)
    }


    clearFilterSettings(propName: string) {
        this.data[this.id].filters[propName] = {name: propName}
        this.saveData(this.data)
    }


    clearFilterValues(propName: string) {
        this.data[this.id].filters[propName].values = []
        this.data[this.id].filters[propName].values_include_any = []
        this.data[this.id].filters[propName].values_include_all = []
        this.data[this.id].filters[propName].values_exclude_any = []
        this.data[this.id].filters[propName].values_exclude_all = []
        this.data[this.id].filters[propName].startDate = ""
        this.data[this.id].filters[propName].endDate = ""
        this.saveData(this.data)
    }










    addFilterButtons(controlPanel: HTMLElement) {
        let data = this.data 
        let filters = data[this.id].filters
        for (let filter in filters) {
            let buttonName = filter
            let filterData = filters[filter]
            if (filterData.buttonName) buttonName = filterData.buttonName
            let buttonIcon = ""
            if (filterData.buttonIcon) buttonIcon = filterData.buttonIcon
            let selected = this.filterSelected(filterData)

            this.createButton(this, {
                container: controlPanel,
                name: buttonName,
                icon: buttonIcon,
                selected,
                callback: function(e: MouseEvent, plugin:InterPlugin) {
                    plugin.changeFilterValues(filter)
                },
                altCallback: function(e: MouseEvent, plugin:InterPlugin) {
                    plugin.filterOptionsMenu(filter, e)
                    
                }
            })
        }
    }




    filterSelected(filterData: any) {
        if (filterData.values && filterData.values.length > 0) return true
        if (filterData.values_include_any && filterData.values_include_any.length > 0) return true
        if (filterData.values_include_all && filterData.values_include_all.length > 0) return true
        if (filterData.values_exclude_any && filterData.values_exclude_any.length > 0) return true
        if (filterData.values_exclude_all && filterData.values_exclude_all.length > 0) return true
        if (filterData.startDate) return true
        if (filterData.endDate) return true
        return false
    }


    createOptionsButton(controlPanel: HTMLElement) {
        this.createButton(this, {
            container: controlPanel,
            name: "",
            icon: "settings",
            callback: function(e: MouseEvent, plugin:InterPlugin) {
                plugin.optionsMenu(e)
            }
        })
    }




	createButton(plugin: InterPlugin, args: any) {
        let {container, name, icon, callback, altCallback, selected} = args
		let button = container.createEl("button")
        if (selected) button.classList.add("button-selected")
        
        if (icon) {
            obsidian.setIcon(button, icon)
            if (name != " ") button.classList.add("has-icon-with-title")
        }
        button.append(name)

        button.onclick = async (e: Event) => {
            callback(e, plugin, args)
        }
        
        if (altCallback) {
            button.oncontextmenu = (e: Event) => {
                altCallback(e, plugin, args)
            }
        }  
    }



    createRefreshButton(controlPanel: HTMLElement) {
      let button = document.createElement("button")
      button.classList.add("div-refresh-button")
      setIcon(button, "rotate-ccw")
      controlPanel.append(button)
      button.onclick = () => {
        setTimeout(() => {
            this.buildView() 
        }, 100)
      }
    }



    async createPlusButton(controlPanel: HTMLElement) {
        let button = controlPanel.createEl("button", {
            cls: "div-view-button"
        })
        setIcon(button, "plus")
        button.onclick = async () => {
            let content = ""
            let folder = this.data[this.id].filters["file.folder"]?.values?.[0]
            if (!folder || folder == "-") folder = ""
            if (folder != "") folder = folder + "/"
            let newNoteName = "New note"
            let path = this.createSafeNewNotePath(folder, newNoteName, 0)
            this.app.vault.create(path, content) 
            setTimeout(() => {
                this.buildView() 
            }, 100)
        }
    }



    createSafeNewNotePath(folder: string, name: string, num: number): string {
        let numString = " " + num
        if (num == 0) {
            numString = ""
        }
        let path = folder + name + numString + ".md"
        let file = this.app.vault.getAbstractFileByPath(path)
        if (file) {
            return this.createSafeNewNotePath(folder, name, num + 1)
        }
        return path
    }







    async createViewButton(controlPanel: HTMLElement) {
        let data = this.data
        
        let view = data[this.id].settings.view
        
        if (!view) view = "table"
        let icon = "table-2"
        if (view == "list") icon = "list"
        if (view == "cards") icon = "layout-grid"

        let button = controlPanel.createEl("button", {
            cls: "div-view-button"
        })
        setIcon(button, icon)
        button.onclick = async () => {
            let newView = await this.suggester(["table", "cards", "list"])
            
            if (newView && newView != view) {
                data[this.id].settings.view = newView
                this.saveData(data)
                
            }
        }
    }


    async createPaginationBlock(controlPanel: HTMLElement, pagesLength: number) {
        let data = this.data
        let pgValue = data[this.id].settings.page
        if (!pgValue) pgValue = 1
        let pgNum = data[this.id].settings.entriesOnPage
        if (!pgNum) pgNum = 10
        let maxPages = Math.trunc(pagesLength / pgNum) + 1

        let pgWrapper = document.createElement("span")
        pgWrapper.classList.add("div-pagination-wrapper")
        controlPanel.append(pgWrapper)

        let pgPrev = document.createElement("button")
        pgPrev.classList.add("div-pagination-prev")
        setIcon(pgPrev, "chevron-left")
        pgWrapper.append(pgPrev)

        let pgInput = document.createElement("input")
        pgInput.classList.add("div-pagination-input")
        pgWrapper.append(pgInput)

        let pgNext = document.createElement("button")
        pgNext.classList.add("div-pagination-next")
        setIcon(pgNext, "chevron-right")
        pgWrapper.append(pgNext)

        pgInput.setAttribute("value", pgValue)
        pgInput.type = "number"
        pgInput.min = "1"
        pgInput.max = maxPages.toString()

        pgPrev.onclick = () => {
            if (pgValue > 1) {
                pgValue = pgValue - 1
                data[this.id].settings.page = pgValue
                this.saveData(data)
            }
        }

        pgNext.onclick = () => {
            if (pgValue < maxPages) {
                pgValue = pgValue + 1
                data[this.id].settings.page = pgValue
                this.saveData(data)
            }
        }

        pgInput.onkeydown = (e) => {
            if (e.key == "Enter") {
                if (Number(pgInput.value) > maxPages) pgInput.value = maxPages.toString()
                if (Number(pgInput.value) < 1) pgInput.value = "1"
                data[this.id].settings.page = Number(pgInput.value)
                this.saveData(data)
            }
        }

        if (pgValue <= 1) {
            pgPrev.classList.add("inactive")
        }

        if (pgValue >= maxPages) {
            pgNext.classList.add("inactive")
        }
    }


    paginate(filteredFiles: any[]) {
        let data = this.data
        let pgValue = data[this.id].settings.page
        if (!pgValue) pgValue = 1
        let pgNum = data[this.id].settings.entriesOnPage
        if (!pgNum) pgNum = 10
        let start = pgNum * (pgValue - 1)
        let end = start + pgNum
        return filteredFiles.slice(start, end)
    }


	async optionsMenu(e: MouseEvent) {
        let data = this.data
    

        let menu = new Menu()
        menu.addItem(item => {
            item.setTitle("Добавить фильтр")
            .setIcon("filter")
            .onClick(() => {
                this.addOption("filters")
            })
        })
        menu.addItem(item => {
            item.setTitle("Добавить колонку")
            .setIcon("columns")
            .onClick(() => {
                this.addOption("columns")
            })
        })
        
        if (data[this.id].settings.pagination) {
          menu.addItem(item => {
            item.setTitle("Количество элементов на странице")
            .setIcon("binary")
            .onClick(() => {
                this.setPaginationNum()
            })
          })
          menu.addItem(item => {
            item.setTitle("Отключить пагинацию")
            .setIcon("x-square")
            .onClick(() => {
                this.togglePagination()
            })
          })
        } else {
          menu.addItem(item => {
            item.setTitle("Включить пагинацию")
            .setIcon("chevron-right-square")
            .onClick(() => {
                this.togglePagination()
            })
          })
        }
        
        if (data[this.id].settings.showSearch) {
          menu.addItem(item => {
            item.setTitle("Скрыть панель поиска")
            .setIcon("search-x")
            .onClick(() => {
                this.toggleSearch()
            })
          })
        } else {
          menu.addItem(item => {
            item.setTitle("Показать панель поиска")
            .setIcon("search")
            .onClick(() => {
                this.toggleSearch()
            })
          })
        }
        
        
        menu.addItem(item => {
          item.setTitle("Минимальная ширина карточек")
          .setIcon("layout-grid")
		  //@ts-ignore
          let sub = item.setSubmenu() as Menu
            let currentWidth = data[this.id].settings.cards_width
            if (!currentWidth) currentWidth = 150
            let cardsWidths = ["150","175", "200", "225", "250", "275", "300"]
            for (let width of cardsWidths) {
                sub.addItem(subitem => {
                    subitem.setTitle(width)
                    .setChecked(currentWidth == width)
                    .onClick(() => {
                        this.setCardsWidth(width)
                    })
                    
                })
            }
        })


        menu.addItem(item => {
            item.setTitle("Сбросить сортировку")
            .setIcon("list-x")
            .onClick(() => {
                this.clearSorting()
            })
        })




        menu.showAtMouseEvent(e)
    }







	async addOption(option: string) {
        let data = this.data
        let propNames = this.getPropNames()
        let options = data[this.id][option]
        let optionNames = Object.keys(options)
        for (let optionName of optionNames) {
            propNames = propNames.filter((p: string) => p != optionName)
        }

        let fileProperties = [
            "file.link", 
            "file.name",
            "file.folder",
            "file.path",
            "file.inlinks", 
            "file.outlinks", 
            "file.tags", 
            "file.etags",
            "file.lists", 
            "file.tasks",
            "file.cday",
            "file.ctime",
            "file.mday",
            "file.mtime",
            "file.ext",
            "file.size"
        ]

        propNames = fileProperties.concat(propNames)
        propNames = propNames.sort()



        let propName = await this.suggester(propNames)
		

        if (propName && !options[propName]) {
            options[propName] = {
                name: propName
            }
            data[this.id][option] = options
            this.saveData(data)
        }
    }





	async getPropValue(file: TFile, propName: string): Promise<any> {
		let frontmatter, propVal
        await this.app.fileManager.processFrontMatter(file, (fm) => {
            frontmatter = fm
        })
        if (frontmatter) propVal = frontmatter[propName]
        return propVal
	}


	async getData() {
		let data = await this.getPropValue(this.sourceFile, "inter_data")
        return data
	}




	async fixData() {
        let data = this.data
        if (!data || typeof data != "object") data = {}

		
        let oldDataString = JSON.stringify(data)
		
        if (!data[this.id]) {
            data[this.id] = {
                settings: {
                    id: this.id,
                    view: "table",
                    pagination: true,
                    page: 1,
                    entriesOnPage: 10,
                    showSearch: false
                },
                filters: {},
                columns: {}
            }
        }
        let dataString = JSON.stringify(data)
        if (dataString != oldDataString) {
            this.saveData(data)
        }
    }




	async saveData(data: any) {
        await this.app.fileManager.processFrontMatter(this.sourceFile, fm => {
            fm["inter_data"] = data
        })
        setTimeout(() => {
            this.buildView() 
        }, 100)
    }


	






	renderMarkdown(markdown: string) {
		let renderEl = document.createElement("span")
		MarkdownRenderer.render(this.app, markdown, renderEl, "", this)
		return renderEl
	}


	async createDBTable(tableContainer:HTMLElement, files: TFile[]) {
        let data = this.data
        let columns = data[this.id].columns
        let properties = Object.keys(columns)

        let rows = await Promise.all(files.map(async file => {
			let row:any = []
			for (let propName of properties) {
                let cell = await this.renderCell(file, propName)
				row.push(cell)
			}
			return row
		}))
		let table = this.createTable(properties, rows)
        tableContainer.append(table)
	}








	createTable(headers: string[], rows: any) {
        let data = this.data
		let table = document.createElement("table")
		let thead = table.createEl("thead")
		let theadRow = thead.createEl("tr")

		for (let header of headers) {
			let th = theadRow.createEl("th")
            let title = header
            let propTitle = data[this.id].columns[header].title
            if (propTitle) title = propTitle

            let headerEl = th.createEl("div", {
                cls: "div-column-header"
            })
            headerEl.setAttribute("data-prop", header)
            let icon = data[this.id].columns[header].icon
            if(icon) {
                setIcon(headerEl, icon)
                if (title != " ") headerEl.classList.add("has-icon-with-title")
            }
            headerEl.append(title)
		}

		let tbody = table.createEl("tbody")

		for (let row of rows) {
			let tbodyRow = tbody.createEl("tr")
			for (let cell of row) {
				let td = tbodyRow.createEl("td")
				td.append(cell)
			}
		}

		return table
	}




	async renderCell(file: TFile, propName: string) {
        let data = this.data
        let cellValue: any = await this.getPropValue(file, propName)
        let propType = this.getPropertyType(propName)
        
        let cellWrapper = document.createElement("div")
        cellWrapper.classList.add("div-cell-wrapper")
        cellWrapper.setAttribute("data-prop", propName)
        cellWrapper.setAttribute("data-type", propType)
        cellWrapper.setAttribute("data-path", file.path)

        let align = data[this.id].columns[propName].align
        if (align) cellWrapper.classList.add("align-" + align)

        if (Array.isArray(cellValue) && propType != "multitext") cellValue = cellValue[0]

        if (propType == "text" || propType == "multitext") {
            let imageSize = data[this.id].columns[propName].image_size
            if (imageSize) cellWrapper.classList.add("image-size-" + imageSize)
            else cellWrapper.classList.add("image-size-120x120")

            let imageFit = data[this.id].columns[propName].image_fit
            if (imageFit) cellWrapper.classList.add("image-fit-" + imageFit) 
            else cellWrapper.classList.add("image-fit-contain")
        }

        if (propType == "multitext") {
            let listView = data[this.id].columns[propName].list_view
            if (listView == "inline") cellWrapper.classList.add("list-view-inline")
        }


        if (propName.startsWith("file.")) {
            cellValue = await this.getFilePropValue(file, propName)
        }

        if (propName == "file.outlinks") {
            this.renderOutlinks(cellWrapper, cellValue, file)
        }

        else if (propName == "file.tasks") {
            this.renderFileTasks(cellWrapper, cellValue)
        }

        else if (propName == "file.lists") {
            this.renderMultitext(cellWrapper, cellValue, propName)
        }


        else if (propType == "text") {
            if (!cellValue) cellValue = ""
            if (typeof cellValue != "string") cellValue = cellValue.toString()
            MarkdownRenderer.render(this.app, cellValue, cellWrapper, "", this)
        }


        else if (propType == "checkbox") {
            this.renderCheckbox(cellWrapper, cellValue)
        }


        else if (propType == "multitext") {
            this.renderMultitext(cellWrapper, cellValue, propName)
        }


        else if (propType == "number") {
            let view = data[this.id].columns[propName].view
            let max = 100
            if (view && view.startsWith("progress of")) {
                let maxProp = view.replace("progress of ", "")
                let maxVal = await this.getFilePropValue(file, maxProp)
                if (typeof maxVal == "number") max = maxVal
            }
            if (view && view.startsWith("progress") && max) {
                if (!cellValue) cellValue = 0
                let progressWrapper = document.createElement("div")
                progressWrapper.classList.add("div-number-progress-wrapper")
                let progress = document.createElement("progress")
                progress.value = cellValue
                progress.max = max
                progressWrapper.append(progress)
                let progressSpan = document.createElement("span")
                progressSpan.classList.add("div-progress-string")
                let percentString = Math.round(cellValue / max * 100) + " %"
                progressSpan.append(percentString)
                progressWrapper.append(progressSpan)
                cellWrapper.innerHTML = progressWrapper.outerHTML
                cellWrapper.classList.add("div-cell-number-percent")
            } else {
                this.renderNumber(cellWrapper, cellValue)
            }
        }

        else if (propType == "date" || propType == "datetime") {
            this.renderDate(cellWrapper, cellValue, propType, propName)
        }


        






        else {
            if (!cellValue) cellValue = ""
		    if (typeof cellValue != "string") cellValue = cellValue.toString()
            MarkdownRenderer.render(this.app, cellValue, cellWrapper, "", this)
        }
		


        return cellWrapper
	}



    async getFilePropValue(file: TFile, propName: string) {
        if (propName == "file.link") {
            return this.app.fileManager.generateMarkdownLink(file, "", undefined, file.basename)
        }

        else if (propName == "file.name") {
            return file.basename
        }

        else if (propName == "file.path") {
            return file.path
        }

        else if (propName == "file.folder") {
            let folder = file.parent?.path
            if (folder == "/") folder = ""
            return folder
        }

        else if (propName == "file.ext") {
            return file.extension
        }

        else if (propName == "file.size") {
            return file.stat.size
        }

        else if (propName == "file.ctime") {
            let ts = file.stat.ctime
            let date = moment(ts).format("YYYY-MM-DD[T]HH:mm")
            return date
        }

        else if (propName == "file.cday") {
            let ts = file.stat.ctime
            let date = moment(ts).format("YYYY-MM-DD")
            return date
        }

        else if (propName == "file.mtime") {
            let ts = file.stat.mtime
            let date = moment(ts).format("YYYY-MM-DD[T]HH:mm")
            return date
        }

        else if (propName == "file.mday") {
            let ts = file.stat.mtime
            let date = moment(ts).format("YYYY-MM-DD")
            return date
        }


        else if (propName == "file.tags" || propName == "file.etags") {
            let cache = this.app.metadataCache.getFileCache(file)
            let noteTags = cache?.tags?.map(t => t.tag) 
            let frontmatterTags = await this.getPropValue(file, "tags")
            if (frontmatterTags) {
                frontmatterTags = frontmatterTags.map((tag: string) => {
                    if (!tag.startsWith("#")) tag = "#" + tag
                    return tag
                })
                noteTags = noteTags?.concat(frontmatterTags)
            }

            if (propName == "file.tags") {
                let tags = []
                if (noteTags) {
                    for (let tag of noteTags) {
                        let tagParts = tag.split("/")
                        let num = tagParts.length
                        for (let i = 0; i < num; i++) {
                            tag = tagParts.join("/")
                            tags.push(tag)
                            tagParts.pop()
                        }
                    }
                }
                return tags
            }
            return noteTags
        }

        

        else if (propName == "file.inlinks") {
            let inlinks: string[] = []
            let links = this.app.metadataCache.resolvedLinks
            let path = file.path
            for (let key in links) {
                let noteLinks = links[key]
                let hasLinkToThis = noteLinks.hasOwnProperty(path)
                if (hasLinkToThis) {
                    let linkFile = this.app.vault.getAbstractFileByPath(key)
                    if (linkFile instanceof TFile) {
                        let inlink = this.app.fileManager.generateMarkdownLink(linkFile, "", undefined, linkFile.basename)
                        inlinks.push(inlink)
                    }
                }
            }
            return inlinks
        }

        else if (propName == "file.outlinks") {
            let outlinks: string[] = []
            let cache = this.app.metadataCache.getFileCache(file)
            if (cache) {
                let frontmatterLinks = cache.frontmatterLinks || []
                let embeds = cache.embeds || []
                let links = cache.links || []
                outlinks = frontmatterLinks.map(link => link.original)
                .concat(embeds.map(link => link.original))
                .concat(links.map(link => link.original))
            }
            return outlinks
        }

        else if (propName == "file.lists") {
            let lists: string[] = []
            let cache = this.app.metadataCache.getFileCache(file) || {}
            let listItems = cache.listItems || []

            if (listItems.length > 0) {
                let content = await this.app.vault.cachedRead(file)
                let lines = content.split("\n")

                lists = listItems.map(l => {
                    let startLine = l.position.start.line
                    let listBlock = lines[startLine]
                    if (l.task) listBlock = listBlock.replace(/-\s\[[^\[\]]\]\s/, "")
                    else listBlock = listBlock.replace("- ", "")
                    return listBlock.trim()
                })
            }
            return lists
        }

        else if (propName == "file.tasks") {
            let tasks: {
                text: string;
                status: string | undefined;
                completed: boolean;
                checked: boolean;
                line: number;
            }[] = []
            let cache = this.app.metadataCache.getFileCache(file) || {}
            let listItems = cache.listItems || []
            listItems = listItems.filter(l => l.task)

            if (listItems.length > 0) {
                let content = await this.app.vault.cachedRead(file)
                let lines = content.split("\n")

                tasks = listItems.map(l => {
                    let startLine = l.position.start.line
                    let text = lines[startLine]
                    text = text.replace(/-\s\[[^\[\]]\]\s/, "").trim()
                    let status = l.task
                    let completed = (status == "x")
                    let checked = !(status == " ")
                    let line = l.position.start.line
                    let task = {text, status, completed, checked, line}
                    return task
                })
            }


            return tasks
        }



        return undefined
    }



    renderCheckbox(cellWrapper: HTMLElement, cellValue: boolean | undefined) {
        let checkbox = document.createElement("input")
        checkbox.classList.add("div-clickable-prop-checkbox")
        checkbox.type = "checkbox"

        if (cellValue) {
            checkbox.setAttribute("checked", "true")
        } else {
            checkbox.removeAttribute("checked")
        }
        if (cellValue === null || cellValue === undefined) {
            checkbox.setAttribute("data-indeterminate", "true")
        } else {
            checkbox.setAttribute("data-indeterminate", "false")
        }
        cellWrapper.append(checkbox)
    }


    renderMultitext(cellWrapper: HTMLElement, cellValue: any, propName: string){
        if (!cellValue) cellValue = []
        if (!Array.isArray(cellValue)) cellValue = [cellValue]
        let ul = document.createElement("ul")
        ul.classList.add("div-cell-list")
        for (let val of cellValue) {
            let li = document.createElement("li")
            li.classList.add("div-list-item")
            if (typeof val == "string") {
                let valTag = ("div-list-item-" + val).replaceAll(/[\n\r\s\:\(\)\.\,\[\]\*~@\$%\^\&\!\?#]/g, "-").replaceAll(/-+/g, "-").slice(0, 100)
                li.classList.add("div-list-item-string")
                li.classList.add(valTag)
            }
            if (propName == "tags" && !val.startsWith("#")) val = "#" + val
            MarkdownRenderer.render(this.app, val, li, "", this)
            ul.append(li)
        }
        cellWrapper.append(ul)
    }


    renderNumber(cellWrapper: HTMLElement, cellValue: any) {
        if (!cellValue) cellValue = ""
        let inputWrapper = document.createElement("div")
        inputWrapper.classList.add("div-edit-number-wrapper")

        let buttonsWrapper = document.createElement("div")
        buttonsWrapper.classList.add("div-edit-number-buttons-wrapper")

        let numberInput = document.createElement("input")
        numberInput.type = "number"
        numberInput.setAttribute("value", cellValue)
        
        let plusButton = document.createElement("button")
        setIcon(plusButton, "plus")
        plusButton.classList.add("div-edit-number-plus")

        let minusButton = document.createElement("button")
        setIcon(minusButton, "minus")
        minusButton.classList.add("div-edit-number-minus")

        buttonsWrapper.append(plusButton)
        buttonsWrapper.append(minusButton)
        inputWrapper.append(numberInput)
        inputWrapper.append(buttonsWrapper)

        cellWrapper.append(inputWrapper)
    }

    renderDate(cellWrapper: HTMLElement, cellValue: any, propType: string, propName: string) {
        let inputType = "date"
        if (propType == "datetime") inputType = "datetime-local"
        let dateInput = document.createElement("input")
        dateInput.type = inputType
        if (propName.startsWith("file.")) dateInput.readOnly = true 
        dateInput.setAttribute("value", cellValue)
        cellWrapper.append(dateInput)
    }


    renderOutlinks(cellWrapper: HTMLElement, cellValue: any, file: TFile) {
        let view = this.data[this.id].columns["file.outlinks"].view
        if (view == "first image") {
            let cache = this.app.metadataCache.getFileCache(file) || {}
            let embeds = cache.embeds || []
            let imageExtensions = ["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]
            embeds = embeds.filter(embed => {
                let ext = embed.link.replace(/(.+\.)([^\.]+)/, "$2")
                if (imageExtensions.find(e => e == ext)) return true
                return false                
            })
            let embed = embeds[0]
            if (embed) {
                MarkdownRenderer.render(this.app, embed.original, cellWrapper, "", this)
            }
        } else {
            this.renderMultitext(cellWrapper, cellValue, "file.outlinks")
        }
    }


    renderFileTasks(cellWrapper: HTMLElement, cellValue: any) {
        let view = this.data[this.id].columns["file.tasks"].view
        let tasks: {
                text: string;
                status: string | undefined;
                completed: boolean;
                checked: boolean;
                line: number;
            }[] = cellValue
        let allTasksCount = tasks.length
        let completedCount = tasks.filter((task) => task.completed).length

        if (allTasksCount > 0) {
            if (view == "completion numbers") {
                cellWrapper.innerHTML = completedCount + " / " + allTasksCount
            }
            else if (view == "completion percent") {
                cellWrapper.innerHTML = Math.round(completedCount / allTasksCount * 100) + " %"
            }
            else if (view && view.startsWith("completion progress")) {
                let completionString = completedCount + " / " + allTasksCount
                if (view == "completion progress with percents") {
                    completionString = Math.round(completedCount / allTasksCount * 100) + " %"
                }
                let progress = document.createElement("progress")
                progress.classList.add("div-progress")
                progress.max = allTasksCount
                progress.value = completedCount
                let progressWrapper = document.createElement("div")
                progressWrapper.classList.add("div-progress-wrapper")
                let completionNumSpan = document.createElement("span")
                completionNumSpan.classList.add("div-progress-string")
                completionNumSpan.append(completionString)
                progressWrapper.append(progress)
                progressWrapper.append(completionNumSpan)
                cellWrapper.innerHTML = progressWrapper.outerHTML  
            }
            else {
                let ul = document.createElement("ul")
                ul.classList.add("div-cell-list")
                for (let task of tasks) {
                    let li = document.createElement("li")
                    li.classList.add("task-list-item")
                    let checkbox = document.createElement("input")
                    checkbox.classList.add("task-list-item-checkbox")
                    checkbox.classList.add("div-task-list-clickable-checkbox")
                    checkbox.type = "checkbox" 
    
                    if (task.checked) {
                        checkbox.setAttribute("checked", "true")
                    } else {
                        checkbox.removeAttribute("checked")
                    }

                    if (!task.status) task.status = " "   
                    li.setAttribute("data-task", task.status)
                    checkbox.setAttribute("data-line", task.line.toString())
                    li.append(checkbox)
                    li.append(task.text)
                    ul.append(li)
                }
                cellWrapper.innerHTML = ul.outerHTML
            }
        }

        
    }





    getPropertyType(propName: string) {
        let type = "text"
        //@ts-ignore
        let properties = this.app.metadataTypeManager.getAllProperties()
        let property = properties[propName.toLowerCase()]
        if (property) {
            type = property.type
        } 

        if (propName == "file.ext" || propName == "file.name" || propName == "file.folder" ||
            propName == "file.path" || propName == "file.link") {
            type = "text"
        }

        if (propName == "file.tags" || propName == "file.etags" || 
            propName == "file.inlinks" || propName == "file.outlinks" ||
            propName == "file.lists" || propName == "file.tasks") {
            type = "multitext"
        }

        if (propName == "file.size") {
            type = "number"
        }

        if (propName == "file.cday" || propName == "file.mday") {
            type = "date"
        }

        if (propName == "file.ctime" || propName == "file.mtime") {
            type = "datetime"
        }

        if (!type || type == "unknown") type = "text"
        else if (type == "aliases" || type == "tags") type = "multitext"
        return type
    }



	async suggester(values: string[], names?: string[]) {
		let data: Promise<string|undefined> = new Promise((resolve, reject) => {
			new InterSuggestModal(this.app, this, resolve, reject, values, names).open()  
		})
		return data
	}


    async suggesterPlus(values: string[], names?: string[], currentValue?: string) {
		let data: Promise<string|undefined> = new Promise((resolve, reject) => {
			new SuggestPlusModal(this.app, this, resolve, reject, values, names, currentValue).open()  
		})
		return data
	}



    async multiSuggest(header: string, values: string[], 
        currentIncludeAny: string[], currentIncludeAll: string[], 
        currentExcludeAny: string[], currentExcludeAll: string[], 
        activeFilters: string[], allValues: boolean): Promise<any> {
		let data: Promise<any> = new Promise((resolve, reject) => {
			new MultiSuggestModal(this.app, this, header, values, currentIncludeAny, currentIncludeAll, 
                currentExcludeAny, currentExcludeAll, activeFilters, allValues, resolve, reject).open()  
		})
		return data
	}


	getPropNames() {
		//@ts-ignore
        let properties = this.app.metadataTypeManager.properties
        if (properties) {
            let propKeys = Object.keys(properties)
            let propNames = propKeys.map(key => properties[key].name)
            return propNames
        } else return []  
    }






    async changeFilterValues(propName: string) {
        let data = this.data
        let values = await this.getAllPropertyValues(propName)
        let type = this.getPropertyType(propName)
        let filterType = data[this.id].filters[propName].type

        if (type == "text" || type == "number" || type == "multitext") {
            if(!filterType) filterType = "selectOne"
        }

        if (filterType == "selectOne") {
            await this.selectOneFilterValue(propName, values)
        }

        if (filterType == "selectMultiple") {
            await this.selectMultipleFilterValues(propName, values)
        }

        if (type == "checkbox") {
            await this.selectOneFilterValue(propName, [true, false])
        }

        if (type == "date" || type == "datetime") {
            await this.selectDate(propName, type)
        }
    }



    async selectDate(propName: string, type: string) {
        let data = this.data
        let id = this.id

        let currentStartDate = data[id].filters[propName].startDate
        if (currentStartDate && currentStartDate.isLuxonDateTime) currentStartDate = currentStartDate.toISODate()
        let currentEndDate = data[id].filters[propName].endDate
        if (currentEndDate && currentEndDate.isLuxonDateTime) currentEndDate = currentEndDate.toISODate()

        let options = ["-", "day", "week", "month", "year", "period"]
        let option = await this.suggester(options)
        let startDate = ""
        let endDate = ""

        if (option == "-") {
            startDate = "-"
            endDate = "-"
        }
        
        if (option == "day") {
            let date: any = ""
            let dayOptions = ["today", "tomorrow", "yesterday", "date"]
            let dayOption = await this.suggester(dayOptions)
            if (dayOption != "date") {
                if (dayOption == "today") {
                    date = moment().format('YYYY-MM-DD')
                } else if (dayOption == "tomorrow") {
                    date = moment().add(1,'days').format('YYYY-MM-DD')
                } else if (dayOption == "yesterday") {
                    date = moment().add(-1, 'days').format('YYYY-MM-DD')
                }

            } else {
                date = await this.dateInputBare("Дата", "") 
            }
            if (date) {
                startDate = date
                endDate = date
            }           
        }

        if (option == "week") {
            let weekOptions = ["current week", "next week", "last week", "select"]
            let weekOption = await this.suggester(weekOptions)

            if (weekOption == "current week") {
                startDate = moment().day(1).format("YYYY-MM-DD")
                endDate = moment().day(7).format("YYYY-MM-DD")
            }

            if (weekOption == "next week") {
                startDate = moment().day(1).add(7, "days").format("YYYY-MM-DD")
                endDate = moment().day(7).add(7, "days").format("YYYY-MM-DD")
            }

            if (weekOption == "last week") {
                startDate = moment().day(1).subtract(7, "days").format("YYYY-MM-DD")
                endDate = moment().day(7).subtract(7, "days").format("YYYY-MM-DD")
            }
             
            if (weekOption == "select") {
                let currentYear = moment().weekYear()
                let weekValues = []
                let weekNames = []
                for (let i = -1; i <= 1; i++) {
                    let year = currentYear + i
                    let weeksInYear = moment().year(year).weeksInYear()
                    for (let week = 1; week <= weeksInYear; week++) {
                        let weekVal = year + "W" + week
                        if (weekVal.length < 7) weekVal = year + "W0" + week
                        let monday = moment(weekVal).format("D MMMM")
                        let sunday = moment(weekVal).day(7).format("D MMMM")
                        let weekName = year + " неделя " + week + " (" + monday + " - " + sunday + ")"
                        weekValues.push(weekVal)
                        weekNames.push(weekName)
                    }
                }
                
                let week = await this.selectSuggester("Неделя", weekValues, weekNames, moment().day(1).format("YYYY[W]WW"))
                if (week && typeof week == "string") {
                    startDate = moment(week).format("YYYY-MM-DD")
                    endDate = moment(week).day(7).format("YYYY-MM-DD")
                }
            }
        }

        if (option == "month") {
            let monthOptions = ["current month", "next month", "last month", "select"]
            let monthOption = await this.suggester(monthOptions)

            if (monthOption == "current month") {
                startDate = moment().startOf("month").format("YYYY-MM-DD")
                endDate = moment().endOf("month").format("YYYY-MM-DD")   
            }

            if (monthOption == "next month") {
                startDate = moment().add(1, "M").startOf("month").format("YYYY-MM-DD")
                endDate = moment().add(1, "M").endOf("month").format("YYYY-MM-DD")
            }

            if (monthOption == "last month") {
                startDate = moment().subtract(1, "M").startOf("month").format("YYYY-MM-DD")
                endDate = moment().subtract(1, "M").endOf("month").format("YYYY-MM-DD")
            }

            if (monthOption == "select") {
                let currentYear = moment().year()
                let monthValues = []
                let monthNames = []
                for (let i = -1; i <= 1; i++) {
                    let year = currentYear + i
                    for (let month = 1; month <= 12; month++) {
                        let monthVal = year + "-" + month
                        let monthName = moment(monthVal, "YYYY-M").format("MMMM YYYY")
                        monthValues.push(monthVal)
                        monthNames.push(monthName)
                    }
                }
                
                let month = await this.selectSuggester("Месяц", monthValues, monthNames, moment().startOf("month").format("YYYY-M"))
                if (month && typeof month == "string") {
                    startDate = moment(month, "YYYY-M").format("YYYY-MM-DD")
                    endDate = moment(month, "YYYY-M").endOf("month").format("YYYY-MM-DD")
                }
            }
        }

        if (option == "year") {
            let yearOptions = ["current year", "next year", "last year", "select"]
            let yearOption = await this.suggester(yearOptions)
            
            if (yearOption == "current year") {
                startDate = moment().startOf("year").format("YYYY-MM-DD")
                endDate = moment().endOf("year").format("YYYY-MM-DD")
            }

            if (yearOption == "next year") {
                startDate = moment().add(1, "years").startOf("year").format("YYYY-MM-DD")
                endDate = moment().add(1, "years").endOf("year").format("YYYY-MM-DD")  
            }

            if (yearOption == "last year") {
                startDate = moment().subtract(1, "years").startOf("year").format("YYYY-MM-DD")
                endDate = moment().subtract(1, "years").endOf("year").format("YYYY-MM-DD")
            }

            if (yearOption == "select") {
                let currentYear = moment().year()
                let yearValues = []
                for (let yearNum = currentYear - 10; yearNum <= currentYear + 10; yearNum++) {
                    yearValues.push(yearNum.toString())
                }
                
                let year = await this.selectSuggester("Год", yearValues, yearValues, currentYear.toString())
                if (year && typeof year == "string") {
                    startDate = moment(year, "YYYY").format("YYYY-MM-DD")
                    endDate = moment(year, "YYYY").endOf("year").format("YYYY-MM-DD") 
                }
            }
        }

        if (option == "period") {
            let dates: any
            
            if (type == "date") {
                dates = await this.datePeriodInput("name", currentStartDate, currentEndDate, "date")
            }
            if (type == "datetime") {
                dates = await this.datePeriodInput("name", currentStartDate, currentEndDate, "datetime-local")
            }
            
            if (dates) {
                startDate = dates.start
                endDate = dates.end
            }
        }

        if (type == "datetime" && endDate && endDate.length == 10) {
            endDate = endDate + "T23:59:59"
        }

        if (startDate != currentStartDate || endDate != currentEndDate) {
            data[id].filters[propName].startDate = startDate
            data[id].filters[propName].endDate = endDate
            this.saveData(data)
        }
    }






    async getAllPropertyValues(propName: string) {
        let values: any[] = []
        let files = this.app.vault.getFiles()
        await Promise.all(files.map(async file => {
            let propVal
            if (propName.startsWith("file.")) {
                propVal = await this.getFilePropValue(file, propName)
            } else {
                propVal = await this.getPropValue(file, propName)
            }
            if (propVal) {
                if (Array.isArray(propVal)) values = values.concat(propVal)
                else values.push(propVal)
            }

            /*
            await this.app.fileManager.processFrontMatter(file, fm => {
                let propVal = fm[propName]
                if (propVal) {
                    if (Array.isArray(propVal)) values = values.concat(propVal)
                    else values.push(propVal)
                }
            })
                */



        }))
        let valuesSet = new Set(values)
        return [...valuesSet]  
    }



    async dateInputBare(name: string, defaultVal: string) {
		if (!defaultVal) {defaultVal = ""}
		let data = new Promise((resolve, reject) => {
			new DateInputModalBare(this.app, name, defaultVal, resolve, reject).open()  
		}).catch((e) => {console.log(e)})
		return data
	}


    async numberInput(name: string, defaultVal: number|null) {
		if (!defaultVal && defaultVal !== 0) {defaultVal = null}
		let data = new Promise((resolve, reject) => {
			new NumberInputModal(this.app, name, defaultVal, resolve, reject).open()  
		}).catch((e) => {console.log(e)})
		return data
	}



    async prompt(name: string, defaultVal: string) {
		if (!defaultVal) {defaultVal = ""}
		let data = new Promise((resolve, reject) => {
			new PromptModal(this.app, name, defaultVal, resolve, reject).open()  
		}).catch((e) => {console.log(e)})
		return data
	}








    async selectOneFilterValue(propName: string, values: any[]) {
        let data = this.data
        let type = this.getPropertyType(propName)
        let currentValue = data[this.id].filters[propName].values
        if (!currentValue) currentValue = []
        if (type == "number") {
            values = values.map(val => val.toString())
        }
        values = values.map(val => val.toString())
        values.unshift("-")

        
        let value: any = await this.suggester(values)
        if (type == "number") {
            value = Number(value)
        }

        if (value !== currentValue[0]) {
            data[this.id].filters[propName].values = [value]
            this.saveData(data)
        }
    }








    async selectMultipleFilterValues(propName: string, values: any[]) {
        let data = this.data
        let id = this.id
        let type = this.getPropertyType(propName)
        values = values.map(val => val.toString())
        values.unshift("-")

        let currentIncludeAny = data[id].filters[propName].values_include_any
        if (!currentIncludeAny) currentIncludeAny = []
        let currentIncludeAll = data[id].filters[propName].values_include_all
        if (!currentIncludeAll) currentIncludeAll = []
        let currentExcludeAny = data[id].filters[propName].values_exclude_any
        if (!currentExcludeAny) currentExcludeAny = []
        let currentExcludeAll = data[id].filters[propName].values_exclude_all
        if (!currentExcludeAll) currentExcludeAll = []
        let activeFilters = data[id].filters[propName].active_filters
        if (!activeFilters) activeFilters = []
        let valueData

        if (type == "text" || type == "number") {
            valueData = await this.multiSuggest("header", values, currentIncludeAny, currentIncludeAll, currentExcludeAny, currentExcludeAll, activeFilters, false)
        }

        if (type == "multitext") {
            valueData = await this.multiSuggest("header", values, currentIncludeAny, currentIncludeAll, currentExcludeAny, currentExcludeAll, activeFilters, true)
        }

        if (valueData) {
            data[id].filters[propName].values_include_any = valueData.filters.includeAny
            data[id].filters[propName].values_exclude_any = valueData.filters.excludeAny
            data[id].filters[propName].values_include_all = valueData.filters.includeAll
            data[id].filters[propName].values_exclude_all = valueData.filters.excludeAll
            data[id].filters[propName].active_filters = valueData.activeFilters
            this.saveData(data)
        }
    }


    async selectSuggester(name: string, values: string[], names?: string[], defaultVal?: string) {
		if (!defaultVal) {defaultVal = ""}
		let data = new Promise((resolve, reject) => {
			new SelectionInputModal(this.app, resolve, reject, name, values, names, defaultVal).open()  
		}).catch((e) => {console.log(e)})
		return data
	}




    async datePeriodInput(name: string, currentStartDate: string, currentEndDate: string, inputType: string){
		let data = new Promise((resolve, reject) => {
			new DatePeriodInputModal(this.app, name, currentStartDate, currentEndDate, inputType, resolve, reject).open()  
		}).catch((e) => {console.log(e)})
		return data
	}












    async setPropView(propName: string, view: string) {
        if (view == "progress of") {
            let propNames = this.getPropNames()
            let viewProp = await this.suggesterPlus(propNames)
            if (viewProp) view = "progress of " + viewProp
        }
        let data = this.data
        let currentNumberView = data[this.id].columns[propName].view
        if (view != currentNumberView) {
            data[this.id].columns[propName].view = view
            this.saveData(data)
        }
    }











    setCellEditType(propName: string, newType: string) {
        let data = this.data
        let type = data[this.id].columns[propName].editType
        if (newType != type) {
            data[this.id].columns[propName].editType = newType
            this.saveData(data)
        }
    }






    async setImageSize(propName: string, size: string) {
        let currentImageSize = this.data[this.id].columns[propName].image_size
        if (size != currentImageSize) {
            this.data[this.id].columns[propName].image_size = size
            this.saveData(this.data)
        }
    }

    async setImageFit(propName: string, fit: string) {
        let currentImageFit = this.data[this.id].columns[propName].image_fit
        if (fit != currentImageFit) {
            this.data[this.id].columns[propName].image_fit = fit
            this.saveData(this.data)
        }
    }




    async setListView(propName: string, view: string) {
        this.data[this.id].columns[propName].list_view = view
        this.saveData(this.data)
    }


    async setAlign(propName: string, align: string) {
        this.data[this.id].columns[propName].align = align
        this.saveData(this.data)
    }




    async toggleOpenNoteOnClick(propName: string) {
        let data = this.data
        data[this.id].columns[propName].openOnClick = !data[this.id].columns[propName].openOnClick
        this.saveData(data)
    }



    setFilterType(propName: string, newType: string) {
        let type = this.data[this.id].filters[propName].type
        if (newType != type) {
            this.data[this.id].filters[propName].type = newType
            this.saveData(this.data)
        }
    }



    async changePropType(propName: string) {
        let types = ["text", "multitext", "number", "checkbox", "date", "datetime"]
        let newType = await this.suggester(types)
        //@ts-ignore
        if (newType) this.app.metadataTypeManager.setType(propName, newType)
        setTimeout(() => {
            this.buildView() 
        }, 100)
    }



    async setPaginationNum() {
        let pgNum = this.data[this.id].settings.entriesOnPage
        let newPgNum = await this.numberInput("", pgNum)
        if (pgNum != newPgNum) {
            this.data[this.id].settings.entriesOnPage = newPgNum
            this.saveData(this.data)
        }
    }

    togglePagination() {
        this.data[this.id].settings.pagination = !this.data[this.id].settings.pagination
        this.saveData(this.data) 
    }


    toggleSearch() {
        this.data[this.id].settings.showSearch = !this.data[this.id].settings.showSearch
        this.data[this.id].settings.currentSearch = ""
        this.saveData(this.data) 
    }


    setSorting(propName: string) {
        let sortProperty = this.data[this.id].settings.sortProperty
        let sortDirection = this.data[this.id].settings.sortDirection

        if (sortProperty == propName) {
            if (sortDirection == "asc") this.data[this.id].settings.sortDirection = "desc"
            else this.data[this.id].settings.sortDirection = "asc"
        } else {
            this.data[this.id].settings.sortProperty = propName
            this.data[this.id].settings.sortDirection = "asc"
        }

        this.saveData(this.data)
    }


    clearSorting() {
        this.data[this.id].settings.sortProperty = ""
        this.saveData(this.data)
    }


    setCardsWidth(width: string) {
        this.data[this.id].settings.cards_width = width
        this.saveData(this.data) 
    }




    compareValues(val1: any, val2: any) {   
        if (val1 == val2) return true
        if (typeof val1 == "string" && typeof val2 == "string") {
            let linkObj1 = this.getLinkObjectFromMarkdown(val1)
            let linkObj2 = this.getLinkObjectFromMarkdown(val2)

            if (linkObj1.fullPath && linkObj2.fullPath && 
                linkObj1.fullPath == linkObj2.fullPath &&
                linkObj1.subpath == linkObj2.subpath
            ) return true
        }
        return false
    }





    getLinkObjectFromMarkdown(text: string) {
        let linkObj: {
            path: string | undefined;
            fullPath: string | undefined;
            subpath: string | undefined;
            display: string | undefined;
            embed: boolean;
        } = {
            path: undefined,
            fullPath: undefined,
            subpath: undefined, 
            display: undefined,
            embed: false
        }

        let textIsWikilink = text.match(/^(\[\[)([^\]]+)(\]\])$/)
        let textIsEmbeddedWikilink = text.match(/^(\!\[\[)([^\]]+)(\]\])$/)
        if (textIsEmbeddedWikilink) {
            textIsWikilink = textIsEmbeddedWikilink
            linkObj.embed = true
        }

        if (textIsWikilink) {
            let linkText = textIsWikilink[2].replace(/([^|]+)(.*)/, "$1")
            let textLinkObj = parseLinktext(linkText)
            linkObj.path = textLinkObj.path
            linkObj.fullPath = textLinkObj.path
            linkObj.subpath = textLinkObj.subpath
        }

        let textIsMarkdownLink = text.match(/^(\[)([^\]]*)(\])(\()([^\)]+)(\.md\))$/)
        let textIsEmbeddedMarkdownLink = text.match(/^(\!\[)([^\]]*)(\])(\()([^\)]+)(\.md\))$/)
        if (textIsEmbeddedMarkdownLink) {
            textIsMarkdownLink = textIsEmbeddedMarkdownLink
            linkObj.embed = true
        }

        if (textIsMarkdownLink) {
            linkObj.path = textIsMarkdownLink[5]
            linkObj.fullPath = textIsMarkdownLink[5]
            linkObj.subpath = "" 
        }

        if (linkObj.path) {
            let file = this.app.metadataCache.getFirstLinkpathDest(linkObj.path, "")
            if (file) linkObj.fullPath = file.path
        }
        return linkObj
    }


    async asyncFilter (arr: any[], asyncFunction: any) {
        let filteredArr: any[] = []
        await Promise.all(arr.map(async a => {
            let result = await asyncFunction(a)
            if (result) filteredArr.push(a)
        }))
        return filteredArr
    }



    async fileInFilter(file: TFile, filterData: any) {
        let propType = this.getPropertyType(filterData.name)
        let filterType = filterData.type
        if(!filterType) filterType = "selectOne"

        if ((propType == "text" || propType == "number") && filterType == "selectOne") {
            return await this.fileInFilterTextSelectOne(file, filterData)
        }

        if ((propType == "text" || propType == "number") && filterType == "selectMultiple") {
            return await this.fileInFilterTextSelectMultiple(file, filterData)
        }

        if (propType == "multitext" && filterType == "selectOne") {
            return await this.fileInFilterMultitextSelectOne(file, filterData)
        }
        
        if (propType == "multitext" && filterType == "selectMultiple") {
            return await this.fileInFilterMultitextSelectMultiple(file, filterData)
        }

        if (propType == "checkbox") {
            return await this.fileInFilterCheckbox(file, filterData)
        }

        if (propType == "date" || propType == "datetime") {
            return await this.fileInFilterDate(file, filterData)
        }

        return true
    }




    async fileInFilterTextSelectOne(file: TFile, filterData: any) {
        let filterValues = filterData.values
        if (!filterValues || filterValues.length == 0) return true
        let filterValue = filterValues[0]
        let propName = filterData.name
        let filePropValue = await this.getPropValue(file, propName)

        if (propName.startsWith("file.")) {
            filePropValue = await this.getFilePropValue(file, propName)
        }

        if (filterValue == "-" && !filePropValue) return true
        if (!filePropValue) return false
        if (typeof filePropValue == "number") filePropValue = filePropValue.toString()
        if (propName == "file.folder") {
            return filePropValue.startsWith(filterValue + "/") || filePropValue == filterValue
        }

        return this.compareValues(filePropValue, filterValue)
    }




    async fileInFilterTextSelectMultiple(file: TFile, filterData: any) {
        let includeAny = filterData.values_include_any
        let excludeAny = filterData.values_exclude_any

        if ((!includeAny || includeAny.length == 0) &&
            (!excludeAny || excludeAny.length == 0)) {
                return true
        }

        let propName = filterData.name
        let filePropValue = await this.getPropValue(file, propName)

        if (propName.startsWith("file.")) {
            filePropValue = await this.getFilePropValue(file, propName)
        }

        if (typeof filePropValue == "number") filePropValue = filePropValue.toString()

        if (includeAny.length > 0) {
            if (!filePropValue) return false
            if (includeAny.find((val: string) => this.compareValues(filePropValue, val))) return true
            return false
        }

        if (excludeAny.length > 0) {
            if (!filePropValue) return true
            if (excludeAny.find((val: string) => this.compareValues(filePropValue, val))) return false
            return true
        }
        return false
    }



    async fileInFilterMultitextSelectOne(file: TFile, filterData: any) {
        
        let filterValues = filterData.values
        if (!filterValues || filterValues.length == 0) return true
        let filterValue = filterValues[0]

        let propName = filterData.name
        let filePropValues = await this.getPropValue(file, propName)

        if (propName.startsWith("file.")) {
            filePropValues = await this.getFilePropValue(file, propName)
        }

        if (propName == "file.lists" || propName == "file.tasks") {
            filePropValues = filePropValues.text
        }

        if (!filePropValues || filePropValues.length == 0) return false

        if (!Array.isArray(filePropValues)) {
            filePropValues = [filePropValues]
        }


        if (filePropValues.find((val: string) => this.compareValues(val, filterValue))) {
            return true
        }
        return false
    }


    async fileInFilterMultitextSelectMultiple(file: TFile, filterData: any) {
        let includeAny = filterData.values_include_any
        let excludeAny = filterData.values_exclude_any
        let includeAll = filterData.values_include_all
        let excludeAll = filterData.values_exclude_all

        let propName = filterData.name
        let filePropValues = await this.getPropValue(file, propName)
        if (propName.startsWith("file.")) {
            filePropValues = await this.getFilePropValue(file, propName)
        }
        if (!filePropValues) filePropValues = []
        if (!Array.isArray(filePropValues)) {
            filePropValues = [filePropValues]
        }

        let testIncludeAny = true
        let testIncludeAll = true
        let testExcludeAny = true
        let testExcludeAll = true

        if (includeAny && includeAny.length > 0) {
            testIncludeAny = false
            for (let value of includeAny) {
                if (filePropValues.length == 0 && value == "-") testIncludeAny = true
                if (filePropValues.find((val: string) => {
                    return this.compareValues(val, value)
                })) testIncludeAny = true
            }
        }

        if (includeAll && includeAll.length > 0) {
            testIncludeAll = false
            for (let value of includeAll) {
                if (filePropValues.find((val: string) => {
                    return this.compareValues(val, value)
                })) testIncludeAll = true
                else if (filePropValues.length == 0 && value == "-") testIncludeAll = true
                else {
                    testIncludeAll = false
                    break
                }
            }
        }

        if (excludeAny && excludeAny.length > 0) {
            for (let value of excludeAny) {
                if (filePropValues.length == 0 && value == "-") testExcludeAny = false
                if (filePropValues.find((val: string) => {
                    return this.compareValues(val, value)
                })) testExcludeAny = false
            }
        }

        if (excludeAll && excludeAll.length > 0) {
            for (let value of excludeAll) {
                if (filePropValues.find((val: string) => {
                    return this.compareValues(val, value)
                })) testExcludeAll = false
                else if (filePropValues.length == 0 && value == "-") testExcludeAll = false
                else {
                    testExcludeAll = true
                    break
                }
            }
        }

        return testIncludeAny && testIncludeAll && testExcludeAny && testExcludeAll
    }



    async fileInFilterCheckbox(file: TFile, filterData: any) {
        let filterValues = filterData.values
        if (!filterValues || filterValues.length == 0) return true
        let filterValue = filterValues[0]
        let filePropValue = await this.getPropValue(file, filterData.name)

        // Если свойства нет, то undefined
        // Если свойство есть, но неопределённое, то null

        if (filePropValue === undefined || filePropValue === null) {
            if (filterValue == "-") return true
            else return false
        }

        filePropValue = filePropValue.toString()
        if (filePropValue == filterValue) return true
        
        return false
    }



    async fileInFilterDate(file: TFile, filterData: any) {
        let startDate = filterData.startDate
        let endDate = filterData.endDate
        let propName = filterData.name
        let filePropValue = await this.getPropValue(file, propName)

        if (propName.startsWith("file.")) {
            filePropValue = await this.getFilePropValue(file, propName)
        }

        if (!startDate && !endDate) return true
        if (startDate == "-" && filePropValue) return false
        if (startDate == "-" && !filePropValue) return true
        if (!filePropValue) return false

        let startDateTs = moment(startDate).valueOf()
        let endDateTs = moment(endDate).valueOf()
        let valueTs = moment(filePropValue).valueOf()

        if (valueTs) {
            if (startDateTs) {
                if (valueTs < startDateTs) return false
            }
            if (endDateTs) {
                if (valueTs > endDateTs) return false
            }
            return true
        }
        return false
    }






    async processTaskCheckbox(taskCheckbox: HTMLInputElement, file: TFile) {
        let lineNum: number = Number(taskCheckbox.getAttribute("data-line")) || 0
        await this.app.vault.process(file, content => {
            let lines = content.split("\n")
            let line = lines[lineNum]

            if (taskCheckbox.checked) {
                lines[lineNum] = line.replace(/(\s*)(- \[ \])/, "$1- [x]")
                let parent = taskCheckbox.parentNode
                if (parent instanceof HTMLElement) {
                    parent.setAttribute("data-task", "x")
                }
                
            } else {
                lines[lineNum] = line.replace(/(\s*)(- \[.\])/, "$1- [ ]")
            }
            

            content = lines.join("\n")
            return content
        })
        
        
        setTimeout(() => {
            this.buildView() 
        }, 100)
    }






    









}















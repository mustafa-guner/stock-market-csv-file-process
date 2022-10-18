const clearTableButton = document.querySelector("#clear-table");
const removeSelected = document.querySelector("#remove-selected");
const tableHeader = document.getElementById("table_header");
const tableBody = document.getElementById("table_body");
const netQTYRowResultRow = document.getElementById("net-qty-result");
const saveButton = document.getElementById("save-button");

//Event Listeners
document.addEventListener("DOMContentLoaded", () => fetchFile());
removeSelected.addEventListener("click", removeSelectedRows);
clearTableButton.addEventListener("click", clearTable);
saveButton.addEventListener("click", saveDataInformation);

let headerColumnIndexes = {};

function removeSingleRow() {
  this.parentElement.parentElement.parentElement.remove();
}

function saveDataInformation() {
  return convertJsontoCSV(convertHTMLtoJSON());
}

function convertJsontoCSV(jsonData, fileName = "sheet.csv") {
  let json = jsonData;

  let fields = Object.keys(json[0]);

  let replacer = function (key, value) {
    return value === null ? "" : value;
  };
  let csv = json.map(function (row, index) {
    return fields
      .map(function (fieldName, i) {
        return JSON.stringify(row[fieldName], replacer);
      })
      .join(",");
  });
  csv.unshift(fields.join(","));
  csv = csv.join("\r\n");

  /* The code that downloads the CSD data as a .csv file*/
  let downloadLink = document.createElement("a");
  let blob = new Blob(["\ufeff", csv]);
  let url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = fileName; //Name the file here
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function calculateNetQty(netQuantities) {
  const re = /[^<>]+(?=<\/)/g;
  const result = netQuantities.match(re).map(Number);
  return result[0];
}

async function fetchFile() {
  try {
    const options = {
      method: "GET",
      headers: { "content-type": "text/csv;charset=UTF-8" },
    };
    const response = await fetch(
      "./2022_05_09_consolidated_trades2.csv",
      options
    );
    const csvData = await response.text();
    appendJsonToTable(csvToJSON(csvData));
    handleSelectedCheckBoxes();
    window.localStorage.setItem("csv", JSON.stringify(csvToJSON(csvData)));
  } catch (err) {
    alert("Error occured while fetching CSV File. Please try again.");
  }
}

function handleSelectedCheckBoxes() {
  const checkboxes = document.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        return (this.parentElement.parentElement.style.background =
          "#dc35465f");
      } else {
        this.parentElement.parentElement.style.background = "transparent";
      }
    });
  });
}

function convertHTMLtoJSON() {
  var $table = $("table"),
    rows = [],
    header = [];

  $table.find("thead th").each(function () {
    header.push($(this).html());
  });

  $table.find("tbody tr").each(function () {
    var row = {};

    $(this)
      .find("td")
      .each(function (i) {
        if (i == 0) return;
        var key = header[i],
          value = $(this).html();

        row[key] = value;
      });

    rows.push(row);
  });

  return rows;
}

function handleInputSelection() {
  const inputs = document.querySelectorAll(
    "#mytable #table_body tr td input[type='text'] "
  );

  inputs.forEach((input, idx, self) => {
    input.addEventListener("keyup", (e) => {
      e.target.parentElement.style.background = "#42cf63a0";
      e.target.classList.add("changed");
    });

    input.addEventListener("click", (e) => {
      const currentInput = e.target;
      return self.forEach((otherInput) => {
        if (otherInput.id !== currentInput.id)
          return otherInput.setAttribute("readonly", 1);
        selectedInput = currentInput;
        currentInput.removeAttribute("readonly");
      });
    });
  });
}

function appendJsonToTable(jsonArray) {
  let quantities = [];

  const headersArray = Object.keys(jsonArray[0]);
  let headersHtml = headersArray.map((h, idx) => {
    const currentHeader = h.split(" ").join("");
    if (currentHeader == "BuyQty" || currentHeader == "SellQty") {
      headerColumnIndexes[currentHeader] = idx;
      return;
    }
    if (currentHeader == "NetQty") headerColumnIndexes[currentHeader] = idx;
    return `<th>${h}</th>`;
  });

  headersHtml.unshift("<th style='width:40px;'></th>");
  headersHtml = headersHtml.join("");

  const tableHtml = jsonArray
    .map((row) => {
      const columns = Object.values(row);

      let columnsInTable = columns.map((c, idx, self) => {
        if (
          idx === headerColumnIndexes["BuyQty"] ||
          idx === headerColumnIndexes["SellQty"]
        )
          return;
        if (idx === headerColumnIndexes["NetQty"] && c == "") c = 0;
        if (self.length < 2) return;
        if (c === "") return;
        return `<td>${c}</td>`;
      });

      //Calculate NET QTY
      quantities.push(
        calculateNetQty(columnsInTable[headerColumnIndexes["NetQty"]])
      );
      columnsInTable.unshift(
        `<td><input class='p-0 m-0 ' type='checkbox'/></td>`
      );
      columnsInTable = columnsInTable.join("");

      return `<tr>${columnsInTable}</tr>`;
    })
    .join("");

  //INSERTING LAST ROW FOR THE TABLE -> ADD MORE & NET QTY Result
  for (let i = 0; i < headersArray.length - 2; i++) {
    const td = document.createElement("td");
    td.style.border = "none";

    if (i == 0) {
      td.colSpan = headersArray.length - 2;
      td.classList.add("bg-success");
      td.innerHTML = ` <button class="w-100 h-100 btn btn-sm btn-success "><i class="fas fa-plus"></i>ADD    ROW</button>`;
      td.id = "more-row";
      td.addEventListener("click", addMoreRow);
      netQTYRowResultRow.appendChild(td);
    }

    if (i == headersArray.length - 6) {
      td.id = "net-qty";
      td.classList.add(
        "d-flex",
        "align-items-center",
        "justify-content-center",
        "w-100",
        "bg-info",
        "text-white"
      );
      td.innerHTML = `<div class='font-weight-bold'>Total:</div><div id='net-amount'> ${quantities.reduce(
        (acc, val) => acc + val
      )}</div>`;
      netQTYRowResultRow.appendChild(td);
    }
  }

  tableHeader.innerHTML = [headersHtml].join("");
  tableBody.innerHTML = [tableHtml].join("");
}

function csvToJSON(csvDataString) {
  const rowsHeader = csvDataString.split("\r").join("").split("\n");
  const headers = rowsHeader[0].split(",");
  const content = rowsHeader.filter((c, i) => i > 0 && c !== "");
  const jsonFormatted = content.map((row) => {
    const columns = row.split(",");
    return columns.reduce((p, c, i) => {
      p[headers[i]] = c;
      return p;
    }, {});
  });
  return jsonFormatted;
}

function clearTable(e) {
  const _tableBody = document.querySelector("#table_body");
  if (_tableBody.childNodes.length === 0)
    return alert("Cant clear empty table");

  while (_tableBody.firstChild) {
    _tableBody.firstChild.remove();
  }

  const QTYResult = netQTYRowResultRow.querySelector("#net-qty");
  QTYResult.childNodes[1].innerText = "0";
}

function removeSelectedRows(e) {
  const _tableBody = document.querySelector("#table_body");
  const rows = _tableBody.querySelectorAll("tr");
  let amounts = [];
  let rowsHeader;

  rows.forEach((row) => {
    const firstColumn = row.childNodes[0];
    const selectedCheckbox = firstColumn.querySelectorAll(
      "input[type='checkbox']:checked"
    );
    Array.from(selectedCheckbox).forEach((element) => {
      row.remove();
      window.localStorage.setItem("csv", JSON.stringify(convertHTMLtoJSON()));
    });
  });

  let csvJSON = window.localStorage.getItem("csv");

  if (csvJSON) {
    csvJSON = JSON.parse(csvJSON);
    rowsHeader = Object.keys(csvJSON[0]);
  }
  csvJSON.map((row) => {
    const columns = Object.values(row);
    return columns.map((c, idx, self) => {
      if (idx === headerColumnIndexes["NetQty"] - 2)
        amounts.push(parseInt(c ? c : 0, 10));
    });
  });
  const netAmount = document.getElementById("net-amount");
  netAmount.innerText = amounts.reduce((acc, val) => acc + val);
}

function addMoreRow(e) {
  const $table = $("table");
  const _tableBody = document.querySelector("#table_body");
  const headerLength = $table.find("thead th").length;
  const tr = document.createElement("tr");
  const appendedElements = [];
  for (let i = 0; i < headerLength - 1; i++) {
    appendedElements.push(
      `<td><input placeholder="Enter data here"  type="text" class='p-0'/></td>`
    );
  }
  appendedElements.unshift(`<td><input class='p-0 m-0' type='checkbox'/></td>`);
  appendedElements.forEach((element) => (tr.innerHTML += element));
  _tableBody.appendChild(tr);
  handleInputSelection();
  handleSelectedCheckBoxes();

  document.querySelectorAll("input[type='text']").forEach((input) => {
    input.addEventListener("input", function (e) {
      this.value = e.target.value;
    });
  });
}

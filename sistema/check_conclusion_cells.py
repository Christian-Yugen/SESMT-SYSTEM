import openpyxl

def check_cells():
    wb = openpyxl.load_workbook('ASO.xlsx')
    ws = wb.active
    coords = ['C21','K21','C25','Y25','AK25','C27','Y27','AK27']
    for c in coords:
        cell = ws[c]
        is_merged = type(cell).__name__ == 'MergedCell'
        print(f"{c}: is_merged={is_merged}, value={cell.value}")

if __name__ == "__main__":
    check_cells()

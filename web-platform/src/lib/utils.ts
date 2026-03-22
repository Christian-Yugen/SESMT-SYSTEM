export const parseMixedDate = (dateStr: any): string | null => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (!str || str === "---") return null;

    // Caso seja número do Excel (ex: "29393")
    if (/^\d{5}$/.test(str)) {
        const excelDate = Number(str);
        // Excel base date is 1899-12-30
        const date = new Date(1899, 11, 30 + excelDate);
        return date.toISOString().split('T')[0];
    }

    // Tenta ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.split(' ')[0].split('T')[0];
    }

    // Tenta DD/MM/AAAA ou DD-MM-AAAA
    const cleanDate = str.split(' ')[0].split('T')[0];
    const parts = cleanDate.includes('-') ? cleanDate.split('-') : cleanDate.split('/');
    
    if (parts.length === 3) {
        let day, month, year;
        if (cleanDate.includes('-')) {
            if (parts[0].length === 4) {
               [year, month, day] = parts;
            } else {
               [day, month, year] = parts;
            }
        } else {
            [day, month, year] = parts;
        }
        
        if (day && day.length === 4 && year.length !== 4) {
            [day, year] = [year, day];
        }

        if (day && month && year && year.length === 4) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }

    return null;
};

export const ensureISO = (dateStr: any) => parseMixedDate(dateStr);

export const formatDate = (dateStr: any) => {
    const isoDate = parseMixedDate(dateStr);
    if (!isoDate) return "---";
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

export const formatBirthInfo = (dateStr: any) => {
    const isoDate = parseMixedDate(dateStr);
    if (!isoDate) return "---";

    const [year, month, day] = isoDate.split('-');
    const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return `${day}/${month}/${year} (${age} anos)`;
};

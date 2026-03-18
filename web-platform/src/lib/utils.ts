
export const ensureISO = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const cleanDate = dateStr.split(' ')[0].split('T')[0];
    if (cleanDate.includes('-')) {
        const parts = cleanDate.split('-');
        if (parts[0].length === 4) return cleanDate; // JÁ ESTÁ NO FORMATO YYYY-MM-DD
        // CASO ESTEJA EM DD-MM-AAAA
        const [p1, p2, p3] = parts;
        return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
    }
    
    // CASO ESTEJA EM DD/MM/AAAA
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        if (year.length === 4) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else if (day.length === 4) {
            return `${day}-${month.padStart(2, '0')}-${year.padStart(2, '0')}`;
        }
    }
    return cleanDate;
};

export const formatBirthInfo = (dateStr: string | undefined) => {
    if (!dateStr) return "---";

    const cleanDate = dateStr.split(' ')[0].split('T')[0];
    const parts = cleanDate.includes('-') ? cleanDate.split('-') : cleanDate.split('/');

    let day, month, year;

    if (cleanDate.includes('-')) {
        [year, month, day] = parts;
    } else {
        [day, month, year] = parts;
    }

    if (!day || !month || !year) return dateStr;

    const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} (${age} anos)`;
};

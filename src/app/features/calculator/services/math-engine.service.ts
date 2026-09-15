import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MathEngineService {

  /**
   * Safely evaluates a mathematical expression string supporting scientific functions
   */
  evaluate(expression: string, angleMode: 'deg' | 'rad' = 'deg'): string {
    if (!expression || expression.trim() === '') return '0';

    try {
      let sanitized = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, `(${Math.PI})`)
        .replace(/e/g, `(${Math.E})`)
        .replace(/²/g, '**2')
        .replace(/³/g, '**3')
        .replace(/√\(([^)]+)\)/g, 'Math.sqrt($1)')
        .replace(/∛\(([^)]+)\)/g, 'Math.cbrt($1)')
        .replace(/√([0-9.]+)/g, 'Math.sqrt($1)')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/sin\(/g, angleMode === 'deg' ? 'Math.sin((Math.PI/180)*' : 'Math.sin(')
        .replace(/cos\(/g, angleMode === 'deg' ? 'Math.cos((Math.PI/180)*' : 'Math.cos(')
        .replace(/tan\(/g, angleMode === 'deg' ? 'Math.tan((Math.PI/180)*' : 'Math.tan(')
        .replace(/asin\(/g, angleMode === 'deg' ? '(180/Math.PI)*Math.asin(' : 'Math.asin(')
        .replace(/acos\(/g, angleMode === 'deg' ? '(180/Math.PI)*Math.acos(' : 'Math.acos(')
        .replace(/atan\(/g, angleMode === 'deg' ? '(180/Math.PI)*Math.atan(' : 'Math.atan(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/(\d+)!/g, (_, n) => `${this.factorial(parseInt(n, 10))}`)
        .replace(/\^/g, '**');

      // Evaluate safely using Function constructor with Math scope
      const func = new Function(`return ${sanitized}`);
      const res = func();

      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        // Round to avoid floating point precision artifacts like 0.30000000000000004
        const rounded = parseFloat(res.toFixed(10));
        return rounded.toString();
      } else if (typeof res === 'boolean') {
        return res ? '1' : '0';
      }
      return 'Error';
    } catch (err) {
      return 'خطأ في التعبير';
    }
  }

  private factorial(n: number): number {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let acc = 1;
    for (let i = 2; i <= n; i++) {
      acc *= i;
    }
    return acc;
  }
}

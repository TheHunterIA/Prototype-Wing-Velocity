export interface InputState {
  pitch: number;      // -1.0 a 1.0 (arfar: nariz para baixo / cima)
  yaw: number;        // -1.0 a 1.0 (guinada: virar esquerda / direita)
  roll: number;       // -1.0 a 1.0 (rolagem: inclinar asa esquerda / direita)
  boost: boolean;     // Turbo / Propulsão quântica
  brake: boolean;     // Freio aerodinâmico
  pause: boolean;     // Pausa
  isGamepadActive: boolean;
  gamepadName: string | null;
}

class InputService {
  private keys: Record<string, boolean> = {};
  private pointer = { x: 0, y: 0 };
  private activeGamepadIndex: number | null = null;
  private gamepadName: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", (e) => {
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.code] = true;
      });

      window.addEventListener("keyup", (e) => {
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.code] = false;
      });

      window.addEventListener("mousemove", (e) => {
        if (document.pointerLockElement) {
          const sens = 0.002;
          this.pointer.x += e.movementX * sens;
          this.pointer.y -= e.movementY * sens; // Natural: mouse para cima = nariz para cima
          this.pointer.x = Math.max(-1.5, Math.min(1.5, this.pointer.x));
          this.pointer.y = Math.max(-1.5, Math.min(1.5, this.pointer.y));
        } else {
          const halfW = window.innerWidth / 2;
          const halfH = window.innerHeight / 2;
          const normX = (e.clientX - halfW) / halfW;
          const normY = -(e.clientY - halfH) / halfH;
          this.pointer.x = Math.max(-1.2, Math.min(1.2, normX * 1.2));
          this.pointer.y = Math.max(-1.2, Math.min(1.2, normY * 1.2));
        }
      });

      document.addEventListener("pointerlockchange", () => {
        if (!document.pointerLockElement) {
          this.pointer.x = 0;
          this.pointer.y = 0;
        }
      });

      window.addEventListener("gamepadconnected", (e: GamepadEvent) => {
        this.activeGamepadIndex = e.gamepad.index;
        this.gamepadName = e.gamepad.id;
      });

      window.addEventListener("gamepaddisconnected", (e: GamepadEvent) => {
        if (this.activeGamepadIndex === e.gamepad.index) {
          this.activeGamepadIndex = null;
          this.gamepadName = null;
        }
      });
    }
  }

  private applyDeadzone(val: number, deadzone = 0.15): number {
    if (Math.abs(val) < deadzone) return 0;
    const sign = Math.sign(val);
    return sign * ((Math.abs(val) - deadzone) / (1 - deadzone));
  }

  public getInputs(pointerRef?: React.MutableRefObject<{ x: number; y: number }>): InputState {
    let pitch = 0;
    let yaw = 0;
    let roll = 0;
    let boost = false;
    let brake = false;
    let pause = false;
    let isGamepadActive = false;

    // 1. Polling de Gamepad (Xbox, PlayStation, Joysticks USB)
    if (typeof navigator !== "undefined" && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      let gp: Gamepad | null = null;

      if (this.activeGamepadIndex !== null && gamepads[this.activeGamepadIndex]) {
        gp = gamepads[this.activeGamepadIndex];
      } else {
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            gp = gamepads[i];
            this.activeGamepadIndex = i;
            this.gamepadName = gp.id;
            break;
          }
        }
      }

      if (gp) {
        const rawLx = gp.axes[0] || 0;
        const rawLy = gp.axes[1] || 0;
        const rawRx = gp.axes[2] || 0;

        const gpPitch = this.applyDeadzone(rawLy);
        const gpYaw = this.applyDeadzone(rawLx);
        const gpRoll = this.applyDeadzone(rawRx);

        const btnBoost = (gp.buttons[0]?.pressed || gp.buttons[7]?.value > 0.3);
        const btnBrake = (gp.buttons[1]?.pressed || gp.buttons[6]?.value > 0.3);
        const btnPause = gp.buttons[9]?.pressed;

        if (Math.abs(gpPitch) > 0 || Math.abs(gpYaw) > 0 || Math.abs(gpRoll) > 0 || btnBoost || btnBrake) {
          isGamepadActive = true;
          pitch = -gpPitch * 1.5;
          yaw = gpYaw * 1.5;
          roll = gpRoll * 2.0;
          boost = btnBoost;
          brake = btnBrake;
          pause = btnPause || false;
        }
      }
    }

    // 2. Se nenhum controle analógico estiver se movendo, a lógica original do mouse + teclado assume 100%
    if (!isGamepadActive) {
      pitch = -this.pointer.y;
      yaw = -this.pointer.x;

      if (this.keys["a"] || this.keys["A"]) roll -= 2.2;
      if (this.keys["d"] || this.keys["D"]) roll += 2.2;

      boost = !!(this.keys[" "] || this.keys["ArrowUp"] || this.keys["Shift"] || this.keys["e"] || this.keys["E"]);
      brake = !!(this.keys["s"] || this.keys["S"] || this.keys["ArrowDown"]);
      pause = !!(this.keys["Escape"] || this.keys["p"] || this.keys["P"]);
    }

    // Sincronizar pointerRef se fornecido
    if (pointerRef) {
      pointerRef.current.x = this.pointer.x;
      pointerRef.current.y = this.pointer.y;
    }

    // Amortecimento dinâmico original
    const damping = 0.88;
    this.pointer.x *= damping;
    this.pointer.y *= damping;

    return {
      pitch: Math.max(-1.5, Math.min(1.5, pitch)),
      yaw: Math.max(-1.5, Math.min(1.5, yaw)),
      roll: Math.max(-2.5, Math.min(2.5, roll)),
      boost,
      brake,
      pause,
      isGamepadActive,
      gamepadName: this.gamepadName
    };
  }
}

export const inputService = new InputService();

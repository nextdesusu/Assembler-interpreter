const EOL = "\n";
const REGEX_SPLIT = /'[\w\d\(\)\+\/\=\s\!\:\,\^]{0,}'|\:|\;|[\w\d]{0,}/g;
const DEFAULT_MESSAGE = -1;

class AsmInt {
  constructor() {
    this._labels = new Map();
    this._variables = new Map();
    this._cmpArgs = { left: null, right: null };
    this._msg = DEFAULT_MESSAGE;
    this._finishedCorrectly = false;
    this._errors = [];
  }

  compare(a, b) {
    //store for future comparance operations
    this._cmpArgs = { left: a, right: b };
  }

  get cmpArgs() {
    const { left, right } = this._cmpArgs;
    if (left === null || right === null) {
      this._errors.push(`Nothing been compared!`);
    } else if (left === undefined || right === undefined) {
      this._errors.push(`Comparance happened incorrectly!`);
    } else {
      return this._cmpArgs;
    }
  }

  handleCommand(command, args) {
    switch (command) {
      //"ariphmetics"
      case "inc":
        return this.setVarValue(args[0], this.getVarValue(args[0]) + 1);
      case "dec":
        return this.setVarValue(args[0], this.getVarValue(args[0]) - 1);
      case "add":
        return this.setVarValue(
          args[0],
          this.getVarValue(args[0]) + this.atomize(args[1])
        );
      case "sub":
        return this.setVarValue(
          args[0],
          this.getVarValue(args[0]) - this.atomize(args[1])
        );
      case "mul":
        return this.setVarValue(
          args[0],
          this.getVarValue(args[0]) * this.atomize(args[1])
        );
      case "div":
        return this.setVarValue(
          args[0],
          Math.floor(this.getVarValue(args[0]) / this.atomize(args[1]))
        );
      case "cmp":
        return this.compare(this.atomize(args[0]), this.atomize(args[1]));
      //labels and jumps
      case "call":
        return this.callLabel(args[0]);
      case "jmp":
        return this.callLabel(args[0]);
      case "jne":
        return (
          this.cmpArgs.left !== this.cmpArgs.right && this.callLabel(args[0])
        );
      case "je":
        return (
          this.cmpArgs.left === this.cmpArgs.right && this.callLabel(args[0])
        );
      case "jge":
        return (
          this.cmpArgs.left >= this.cmpArgs.right && this.callLabel(args[0])
        );
      case "jg":
        return (
          this.cmpArgs.left > this.cmpArgs.right && this.callLabel(args[0])
        );
      case "jle":
        return (
          this.cmpArgs.left <= this.cmpArgs.right && this.callLabel(args[0])
        );
      case "jl":
        return (
          this.cmpArgs.left < this.cmpArgs.right && this.callLabel(args[0])
        );
      //system
      case "end":
        return this.correctFinish();
      case "msg":
        return this.processMsg(args);
      case "mov":
        return this.addVariable(args[0], this.atomize(args[1]));
      //shouldnt get to this ones
      case "ret":
      default:
        this._errors.push(`Unknown command: ${command}`);
    }
  }

  correctFinish() {
    this._finishedCorrectly = true;
  }

  addLabel(name, body) {
    this._labels.set(name, body);
  }

  callLabel(name) {
    const labelBody = this._labels.get(name);
    this.evaluate(labelBody);
    return true;
    /*
      return true so instructions like:
        "this.cmpArgs.left < this.cmpArgs.right && this.callLabel(args[0])"
      would be true!
    */
  }

  addVariable(name, value) {
    this._variables.set(name, value);
  }

  getVarValue(name) {
    return this._variables.get(name);
  }

  setVarValue(name, value) {
    if (!this._variables.has(name))
      this._errors.push(`Undefined variable: ${name}`);
    this._variables.set(name, value);
  }

  processMsg(args) {
    this._msg = args.map((item) => this.atomize(item)).join("");
  }

  tokenize(command) {
    return command
      .match(REGEX_SPLIT)
      .filter((str) => str !== "" && str !== " ");
  }

  isLabel(tokens) {
    return tokens.indexOf(":") !== -1;
  }

  extractLabelName(tokens) {
    return tokens[0];
  }

  splitToBodyAndLabels(programm) {
    let splitIndex = 0;
    for (; splitIndex < programm.length; splitIndex += 1) {
      const tokens = programm[splitIndex];
      if (this.isLabel(tokens)) break;
    }
    return [
      programm.slice(0, splitIndex),
      programm.slice(splitIndex, programm.length),
    ];
  }

  getRidOfComments(programm) {
    return programm
      .map((item) => {
        const ind = item.indexOf(";");
        return ind === -1 ? item : item.slice(0, ind);
      })
      .filter((items) => items.length > 0); //if string have only a comment it leaves an empty array!
  }

  extractLabels(labelsDefinitions) {
    let currentLabelBody = [];
    for (let _ = labelsDefinitions.length - 1; _ > -1; _ -= 1) {
      const item = labelsDefinitions.pop();
      if (this.isLabel(item)) {
        const name = this.extractLabelName(item);
        currentLabelBody.reverse();
        this.addLabel(name, currentLabelBody);
        currentLabelBody = [];
      } else {
        currentLabelBody.push(item);
      }
    }
  }

  atomize(token) {
    if (token.startsWith("'") || token.startsWith('"')) {
      return token.slice(1, token.length - 1);
    } else if (this._variables.has(token)) {
      return this._variables.get(token);
    } else {
      const res = Number(token);
      if (Number.isNaN(res)) {
        this._errors.push(`Fail to atomize: ${token}`);
      }
      return res;
    }
  }

  evaluate(instructions) {
    for (const instruction of instructions) {
      const name = instruction[0];
      switch (name) {
        case "ret":
          return;
        case "end":
          this.handleCommand("end", []);
          return;
        default:
          const args = instruction.slice(1, instruction.length);
          const result = this.handleCommand(name, args);
          if (name.startsWith("j") && result) {
            return;
          }
      }
    }
  }

  parse(str) {
    const lines = str.split(EOL);
    const rawTokens = lines.map((line) => this.tokenize(line));
    const programm = this.getRidOfComments(rawTokens);
    const [body, labels] = this.splitToBodyAndLabels(programm);
    this.extractLabels(labels);
    this.evaluate(body);
    if (this._finishedCorrectly && this._errors.length === 0) {
      return this._msg;
    } else {
      return DEFAULT_MESSAGE;
    }
  }
}

const assemblerInterpreter = (str) => {
  const Intrp = new AsmInt();
  return Intrp.parse(str);
};

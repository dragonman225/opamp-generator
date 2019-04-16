# CMOS Folded-Cascode OpAmp Generator

### Disclaimer

* This is experimental.
* This tool does not always generate working opamp parameters.
* According to my test results, users still need quite much knowledge in analog design to make the generated parameters work well.
* The value of this tool may be saving hand calculation time.

### Usage

1. Install `Node.js` and `git`.

2. Open a terminal, enter the following commands (the same on Windows, Linux, macOS).

   Clone the repository

   ```bash
   git clone https://github.com/dragonman225/opamp-generator.git
   ```

   Go into the directory

   ```bash
   cd opamp-generator
   ```

   Install Javascript libraries

   ```bash
   npm install
   ```

   Start the application

   ```bash
   npm run start
   ```

3. Design your OpAmp.

* Check below for instance names of the MOSFETs.

![img](assets/circuit.png)
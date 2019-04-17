# CMOS Folded-Cascode OpAmp Generator

### Disclaimer

* This is experimental.
* This tool does not always generate working opamp parameters.
* According to my test results, users still need quite much knowledge in analog IC design to make the generated parameters work well.
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

3. Edit `src/config.yml`. Change the process dependent parameters and performance specifications.

4. Start the interactive generator

   ```bash
   npm run start
   ```

* Check below for instance names of the MOSFETs.

![img](assets/circuit.png)

### Advanced Stuff

##### Using lambda lookup table

> To consider channel-length modulation and get optimized MOSFET sizes, a lambda lookup table is needed. However, since the relationship of lambda and gate length is process-dependent, I do not provide my lookup table here. You need to do a simulation using your process model and save the lambda v.s. gate length curve as a compatiple CSV file described below, then edit the config to import.

1. Make your CSV file look like this. It can contain arbitrary rows of data.
    ```
    length,lambda_n,lambda_p
    1.8E-07,0.6,0.4
    1.9E-07,0.58,0.36
    2E-07,0.55,0.33
    ```
    * `length` is gate length in meters. `lambda_n` is lambda of NMOS. `lambda_p` is lambda of PMOS.
    * Hints : 
      * `lambda = 1 / (Id * ro - Vds)`.
      * Do simulation with given Id, Vds, and measure ro to get lambda. You can sweep through a range of gate length, and plot the results.
      * To maintain Id at different gate length, W/L ratio need to be constant, so width should also change with gate length.
      * Export the plotted NMOS and PMOS curves as CSV, and use Microsoft Excel or LibreOffice Calc to combine them, also change the column names.
2. Open `src/config.yml`, edit the `lambda_table` property. Change its value to your path. Absolute path is recommended.
    ```yaml
    lambda_table: your_csv_lookup_table.csv
    ```

##### Concepts of Design Procedure

Please see presentation file : https://slides.com/aic999/deck